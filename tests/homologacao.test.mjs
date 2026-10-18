import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const statusData = JSON.parse(readFileSync(new URL('../homologacao-status.json', import.meta.url), 'utf8'));
const dashboardSource = readFileSync(new URL('../homologacao.js', import.meta.url), 'utf8');

function createDashboard(data = statusData) {
    const elements = new Map();
    const createElement = () => ({
        textContent: '',
        innerHTML: '',
        value: '',
        className: '',
        disabled: false,
        style: {},
        listeners: {},
        addEventListener(name, callback) {
            this.listeners[name] = callback;
        }
    });
    const getElement = id => {
        if (!elements.has(id)) {
            elements.set(id, createElement());
        }

        if (id === 'feature-status' && elements.get(id).value === '') {
            elements.get(id).value = 'all';
        }

        return elements.get(id);
    };
    const percentElements = [createElement(), createElement()];
    const document = {
        getElementById: getElement,
        querySelectorAll: selector => selector === '[data-coverage-percent]' ? percentElements : []
    };
    const fetch = async url => ({
        ok: true,
        json: async () => url === 'homologacao-status.json'
            ? data
            : url.includes('/actions/runs')
                ? { workflow_runs: [] }
                : []
    });
    const context = vm.createContext({
        document,
        fetch,
        window: { setInterval() {} },
        Intl,
        Date,
        Math,
        Number,
        String,
        Promise,
        console
    });

    vm.runInContext(dashboardSource, context, { filename: 'homologacao.js' });
    return { elements, getElement, percentElements };
}

async function settleDashboard() {
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
}

test('renders every roadmap item and matching coverage counters', async () => {
    const dashboard = createDashboard();
    await settleDashboard();

    assert.equal(dashboard.getElement('coverage-total').textContent, statusData.coverage.total);
    assert.equal(dashboard.getElement('coverage-completed').textContent, statusData.coverage.completed);
    assert.equal(dashboard.getElement('coverage-pending').textContent, statusData.coverage.pending);
    assert.match(dashboard.getElement('feature-count').textContent, new RegExp(`^${statusData.features.length} tarefas`));
    assert.equal((dashboard.getElement('feature-table').innerHTML.match(/<tr>/g) || []).length, 25);
    assert.equal(dashboard.getElement('feature-page-number').textContent, `Página 1 de ${Math.ceil(statusData.features.length / 25)}`);
});

test('publishes the latest Nebula startup finding without marking T2.1 complete', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-live-runtime-promotion-2026-10-18-0827');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /95\/95/);
    assert.match(event.evidence, /sem download real/i);
});

test('search, status filter and pagination expose the matching roadmap rows', async () => {
    const dashboard = createDashboard();
    await settleDashboard();

    dashboard.getElement('feature-search').value = 'T6.1';
    dashboard.getElement('feature-search').listeners.input();
    assert.match(dashboard.getElement('feature-table').innerHTML, /T6\.1/);
    const t61Count = statusData.features.filter(feature => `${feature.id} ${feature.name} ${feature.area}`.includes('T6.1')).length;
    assert.equal((dashboard.getElement('feature-table').innerHTML.match(/<tr>/g) || []).length, Math.min(t61Count, 25));
    assert.equal(dashboard.getElement('feature-page-status').textContent, `Itens 1–${Math.min(t61Count, 25)} de ${t61Count}`);

    dashboard.getElement('feature-search').value = '';
    dashboard.getElement('feature-search').listeners.input();
    dashboard.getElement('feature-next').listeners.click();
    assert.equal(dashboard.getElement('feature-page-number').textContent, `Página 2 de ${Math.ceil(statusData.features.length / 25)}`);

    dashboard.getElement('feature-status').value = 'completed';
    dashboard.getElement('feature-status').listeners.change();
    assert.match(dashboard.getElement('feature-table').innerHTML, /Concluído/);
    assert.doesNotMatch(dashboard.getElement('feature-table').innerHTML, /Pendente/);
    assert.equal(dashboard.getElement('feature-prev').disabled, true);
});

test('formal Android matrix separates local evidence from pending product acceptance', async () => {
    const dashboard = createDashboard();
    await settleDashboard();

    const areas = statusData.androidHomologation.areas;
    assert.equal(areas.length, 21);
    assert.equal(areas.filter(area => area.status === 'completed').length, 10);
    assert.equal(areas.filter(area => area.status === 'in_progress').length, 2);
    assert.equal(areas.filter(area => area.status === 'pending').length, 9);
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
    assert.match(dashboard.getElement('android-homologation-state').textContent, /10 validadas localmente · 2 em homologação · 9 pendentes · aceite geral pendente/);
    assert.match(dashboard.getElement('android-homologation-table').innerHTML, /Descoberta e troca automática entre LAN e internet/);
    assert.match(dashboard.getElement('android-homologation-table').innerHTML, /receiver Chromecast\/Web real/);
    assert.match(dashboard.getElement('android-homologation-table').innerHTML, /Leitura de EPUB\/CBZ servidos pela instância real/);
    assert.match(dashboard.getElement('android-task-checklist').textContent, /228\/275 marcados e 47 abertos/);
});

test('portal renders every formal Android area and preserves its status evidence', async () => {
    const areas = statusData.androidHomologation.areas;
    const dashboard = createDashboard();
    await settleDashboard();
    const rendered = dashboard.getElement('android-homologation-table').innerHTML;

    assert.equal(new Set(areas.map(area => area.id)).size, 21);
    for (const area of areas) {
        assert.match(rendered, new RegExp(area.id));
        assert.ok(rendered.includes(area.name), `portal must show ${area.id} name`);
        assert.ok(rendered.includes(area.evidence), `portal must show ${area.id} evidence`);
    }
    assert.equal((rendered.match(/<tr>/g) || []).length, 21);
});

test('portal publishes current per-download pause and resume evidence without closing formal gates', async () => {
    const android = statusData.tracks.find(track => track.id === 'android');
    const downloads = statusData.androidHomologation.areas.find(area => area.id === 'APK-H07');
    const event = statusData.events.find(item => item.id === 'android-per-download-pause-resume-2026-10-13');

    assert.match(statusData.generatedAt, /^2026-10-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/);
    assert.equal(android.testAudit.passed, 1741);
    assert.equal(android.testAudit.total, 1741);
    assert.equal(android.instrumentationAudit.passed, 40);
    assert.equal(android.instrumentationAudit.total, 41);
    assert.equal(android.instrumentationAudit.failed, 1);
    assert.match(downloads.evidence, /HTTP Range até COMPLETED/);
    assert.ok(event, 'portal should include the current Android development event');
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'completed').length, 10);
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'in_progress').length, 2);
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'pending').length, 9);
    assert.match(event.evidence, /APK-H17 continua pendente/);
    assert.match(event.evidence, /Nenhuma versão, APK de produção ou release criada/);
});

test('portal records the complete session-navigation retest without changing formal homologation', async () => {
    const android = statusData.tracks.find(track => track.id === 'android');
    const event = statusData.events.find(item => item.id === 'android-session-navigation-stability-2026-10-13');

    assert.ok(event, 'portal should record the latest complete session-navigation run');
    assert.match(event.evidence, /passou 9\/9/);
    assert.match(event.evidence, /MainActivitySessionNavigationTest-PHONE-API35\.xml/);
    assert.match(event.evidence, /falha histórica 8\/9 permanece sem causa confirmada/);
    assert.match(android.instrumentationAudit.label, /MainActivitySessionNavigationTest 9\/9/);
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'completed').length, 10);
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'in_progress').length, 2);
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'pending').length, 9);
});

test('portal reports the latest server-switch login regression as in progress, not homologated', async () => {
    const android = statusData.tracks.find(track => track.id === 'android');
    const area = statusData.androidHomologation.areas.find(item => item.id === 'APK-H02');
    const event = statusData.events.find(item => item.id === 'android-profile-server-switch-login-investigation-2026-10-14');

    assert.match(statusData.generatedAt, /^2026-10-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/);
    assert.equal(area.status, 'in_progress');
    assert.match(area.evidence, /108 testes unitários.*passaram/);
    assert.match(area.evidence, /falhou ao aguardar o retorno ao catálogo/);
    assert.equal(android.homologation.completed, 10);
    assert.equal(android.homologation.total, 21);
    assert.equal(android.instrumentationAudit.passed, 40);
    assert.equal(android.instrumentationAudit.total, 41);
    assert.equal(android.instrumentationAudit.failed, 1);
    assert.ok(event, 'portal should record the active Android investigation');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /profile-server-switch-login-red\.xml/);
    assert.match(event.evidence, /Sem versão, APK de produção, release ou alteração de servidor/);
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
});

test('portal records update-effect test isolation without changing formal homologation', async () => {
    const android = statusData.tracks.find(track => track.id === 'android');
    const event = statusData.events.find(item => item.id === 'android-update-effect-test-isolation-2026-10-13');

    assert.match(statusData.generatedAt, /^2026-10-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/);
    assert.match(event.evidence, /Activity não intercepta sockets GitHub ponta a ponta/);
    assert.match(event.evidence, /AppUpdateCheckEffectTest-PHONE-API35\.xml/);
    assert.equal(android.testAudit.passed, 1741);
    assert.equal(android.instrumentationAudit.passed, 40);
    assert.equal(android.instrumentationAudit.total, 41);
    assert.equal(android.instrumentationAudit.failed, 1);
    assert.match(android.instrumentationAudit.label, /AppUpdateCheckEffectTest 2\/2/);
    assert.ok(event, 'portal should record the completed Android test isolation update');
    assert.match(event.evidence, /TDD RED/);
    assert.match(event.evidence, /AppUpdateCheckEffectTest` passou 2\/2/);
    assert.match(event.evidence, /Quality gate .* passou/);
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'completed').length, 10);
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'in_progress').length, 2);
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'pending').length, 9);
});

test('portal records SyncPlay event-flow integration without formal acceptance', async () => {
    const android = statusData.tracks.find(track => track.id === 'android');
    const event = statusData.events.find(item => item.id === 'android-syncplay-realtime-event-flow-2026-10-13');

    assert.ok(event, 'portal should reflect the newly verified SyncPlay integration test');
    assert.match(event.evidence, /MockWebServer/);
    assert.match(event.evidence, /Registro histórico de 13\/10\/2026/);
    assert.match(event.evidence, /cobertura subsequente de onClosing\/onClosed, onFailure, Disconnected, retry e stop/);
    assert.ok(statusData.events.some(item => item.id === 'android-syncplay-remote-close-2026-10-13'));
    assert.equal(android.testAudit.passed, 1741);
    assert.equal(android.testAudit.total, 1741);
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'completed').length, 10);
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'in_progress').length, 2);
    assert.equal(statusData.androidHomologation.areas.filter(area => area.status === 'pending').length, 9);
});

test('portal includes reader cold-start evidence without closing APK-H21 or formal acceptance', async () => {
    const android = statusData.tracks.find(track => track.id === 'android');
    const area = statusData.androidHomologation.areas.find(item => item.id === 'APK-H21');
    const event = statusData.events.find(item => item.id === 'android-book-reader-cold-start-harness-2026-10-13');

    assert.ok(event, 'portal should include the latest Android reader cold-start evidence');
    assert.match(event.evidence, /renderização do livro 1\/1/);
    assert.match(event.evidence, /Servidor e conteúdo sintéticos/);
    assert.match(area.evidence, /\/BookReader\/Epub/);
    assert.equal(area.status, 'pending');
    assert.equal(android.testAudit.passed, 1741);
    assert.equal(android.instrumentationAudit.passed, 40);
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
    assert.equal(statusData.androidHomologation.areas.filter(item => item.status === 'completed').length, 10);
    assert.equal(statusData.androidHomologation.areas.filter(item => item.status === 'in_progress').length, 2);
    assert.equal(statusData.androidHomologation.areas.filter(item => item.status === 'pending').length, 9);
});

test('portal records API 37 emulator boot blocker without counting tests or closing APK-H14', () => {
    const android = statusData.tracks.find(track => track.id === 'android');
    const area = statusData.androidHomologation.areas.find(item => item.id === 'APK-H14');
    const event = statusData.events.find(item => item.id === 'android-local-network-api37-emulator-boot-blocked-2026-10-13');

    assert.ok(event);
    assert.equal(event.status, 'blocked');
    assert.match(event.evidence, /surfaceflinger.*hasReadColorBufferDma/);
    assert.match(event.evidence, /nenhum caso de permissão foi contado/);
    assert.equal(android.instrumentationAudit.passed, 40);
    assert.equal(android.instrumentationAudit.failed, 1);
    assert.equal(area.status, 'pending');
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
});

test('portal records Android API 24 and 35 connectivity callback validation without closing APK-H14', () => {
    const android = statusData.tracks.find(track => track.id === 'android');
    const checklist = statusData.androidHomologation.taskChecklist;
    const area = statusData.androidHomologation.areas.find(item => item.id === 'APK-H14');
    const event = statusData.events.find(item => item.id === 'android-connectivity-callback-api24-api35-2026-10-13');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /passou 3\/3 em PHONE\/API 35 e 3\/3 em PHONE\/API 24/);
    assert.equal(android.instrumentationAudit.passed, 40);
    assert.equal(android.instrumentationAudit.total, 41);
    assert.equal(android.instrumentationAudit.failed, 1);
    assert.equal(checklist.checked, 228);
    assert.equal(checklist.unchecked, 47);
    assert.equal(area.status, 'pending');
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
});

test('portal renders blocked validation events with a Portuguese warning state', async () => {
    const blockedEvent = statusData.events.find(item => item.id === 'android-local-network-api37-emulator-boot-blocked-2026-10-13');
    const dashboard = createDashboard({ ...statusData, events: [blockedEvent, ...statusData.events.filter(item => item !== blockedEvent)] });
    await settleDashboard();

    const events = dashboard.getElement('event-list').innerHTML;
    assert.match(events, /Tentativa de validar permissão de rede local na API 37/);
    assert.match(events, /Bloqueado/);
    assert.match(events, /event-dot is-warn/);
});

test('portal mirrors the Home cache URL-scope fix without closing formal homologation', () => {
    const android = statusData.tracks.find(track => track.id === 'android');
    const area = statusData.androidHomologation.areas.find(item => item.id === 'APK-H04');
    const event = statusData.events.find(item => item.id === 'android-home-cache-default-port-normalization-2026-10-13');

    assert.match(statusData.generatedAt, /^2026-10-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/);
    assert.equal(android.testAudit.passed, 1741);
    assert.equal(android.testAudit.total, 1741);
    assert.match(android.testAudit.label, /1\.741 aprovados/);
    assert.ok(event, 'portal must record the verified Android cache-scope fix');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /RED.*1 falha esperada/);
    assert.match(event.evidence, /HTTPS :443 e HTTP :80/);
    assert.match(area.evidence, /escopo de cache offline da Home/);
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
    assert.equal(statusData.androidHomologation.areas.filter(item => item.status === 'completed').length, 10);
    assert.equal(statusData.androidHomologation.areas.filter(item => item.status === 'in_progress').length, 2);
    assert.equal(statusData.androidHomologation.areas.filter(item => item.status === 'pending').length, 9);
});

test('portal records Home cache DataStore persistence tests without closing formal homologation', () => {
    const android = statusData.tracks.find(track => track.id === 'android');
    const area = statusData.androidHomologation.areas.find(item => item.id === 'APK-H04');
    const event = statusData.events.find(item => item.id === 'android-home-cache-datastore-persistence-2026-10-13');

    assert.ok(event, 'portal should record the latest DataStore persistence validation');
    assert.equal(event.status, 'completed');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    assert.match(event.evidence, /HomeFeedCacheRepositoryPersistenceTest passou 4\/4/);
    assert.match(event.evidence, /não possuem RED\/GREEN comportamental/);
    assert.match(android.instrumentationAudit.label, /HomeFeedCacheRepositoryPersistenceTest 4\/4/);
    assert.equal(android.instrumentationAudit.passed, 40);
    assert.equal(android.instrumentationAudit.total, 41);
    assert.equal(android.instrumentationAudit.failed, 1);
    assert.match(area.evidence, /recriar DataStore\/repositório/);
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');
    assert.equal(statusData.androidHomologation.areas.filter(item => item.status === 'completed').length, 10);
    assert.equal(statusData.androidHomologation.areas.filter(item => item.status === 'in_progress').length, 2);
    assert.equal(statusData.androidHomologation.areas.filter(item => item.status === 'pending').length, 9);
});

test('portal publishes the completed MulletaFlix Server 12.1.21 release with validation limits', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-configured-monitor-paths-2026-10-16');
    const audit = statusData.tracks.find(track => track.id === 'server').testAudit;

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /releases\/tag\/v12\.1\.21/);
    assert.match(event.evidence, /repetição final ficou inconclusiva/);
    assert.match(event.evidence, /não valida reprodução, upload\/download nem instalação/);
    assert.equal(audit.passed, 5081);
    assert.equal(audit.total, 5145);
    assert.equal(audit.skipped, 64);
    assert.equal(audit.failed, 0);

});

test('portal publishes Nebula package and download-start validation without claiming production success', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-installer-validation-2026-10-17-0101');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /12\.1\.21.*stage 12\.1\.22/s);
    assert.match(event.evidence, /581\/581.*10\/10/);
    assert.match(event.evidence, /scanner\/helpers 86\/86/);
    assert.match(event.evidence, /1\.452 aprovados\/60 ignorados\/0 falhas/);
    assert.match(event.evidence, /marcador de readiness emitido pelo Python corresponde aos marcadores consumidos pelo manager C\#/);
    assert.match(event.evidence, /testes de bootstrap do rclone e de integridade do stage passaram/);
    assert.match(event.evidence, /instalador Windows compilou com sucesso/);
    assert.match(event.evidence, /Não houve instalação.*download real/);
    assert.match(event.evidence, /release v12\.1\.22 (?:ainda )?não existe/i);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Validar pacote e correção do início do download Nebula/);
});

test('portal records MariaDB integration fixture safety and inconclusive full server suite', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-runtime-mismatch-2026-10-17-0120');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /ActivityLogController passou 1\/1/);
    assert.match(event.evidence, /testhost.*somente na 33099, não na 3306/);
    assert.match(event.evidence, /encerrada após mais de 18 minutos sem resultado final; permanece inconclusiva/);
    assert.match(event.evidence, /primeiro download real não está validado/);
});

test('server audit publishes the complete local suite and preserves the remote CI blocker', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-ci-billing-block-2026-10-16-2039');
    const suiteEvent = statusData.events.find(item => item.id === 'server-full-solution-tests-release-build-2026-10-16-2051');

    assert.equal(server.status, 'in_progress');
    assert.match(server.testAudit.label, /5\.081 aprovados, 64 ignorados, 0 falhas/);
    assert.match(server.testAudit.label, /[Hh]omologação formal continua aberta/);
    assert.equal(server.testAudit.failed, 0);
    assert.ok(event);
    assert.equal(event.status, 'blocked');
    assert.match(event.evidence, /runner_id=0/);
    assert.match(event.evidence, /locked due to a billing issue/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    assert.ok(suiteEvent);
    assert.equal(suiteEvent.status, 'completed');
    assert.match(suiteEvent.evidence, /Integration\/live externos não foram executados/);
    assert.match(suiteEvent.evidence, /nenhuma nova release de servidor foi criada/);
    assert.ok(Date.parse(suiteEvent.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /bloqueio externo do CI remoto/);
});

test('portal records the current deterministic server suite without claiming integration or production validation', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-server-suite-gate-2026-10-18-0247');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(server.testAudit.passed, 5081);
    assert.equal(server.testAudit.total, 5145);
    assert.equal(server.testAudit.skipped, 64);
    assert.equal(server.testAudit.failed, 0);
    assert.match(server.testAudit.label, /FullyQualifiedName!~Integration/);
    assert.match(event.evidence, /NebulaPython.*592\/592/);
    assert.match(event.evidence, /não tiveram testes correspondentes ao filtro/);
    assert.match(event.evidence, /Nenhuma release de servidor criada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /gate determinístico \.NET aprovado/);
});

test('portal records the orphaned Nebula worker and avoids claiming a production repair', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-nebula-orphaned-worker-2026-10-18-0254');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /12\.1\.21/);
    assert.match(event.evidence, /PID pai já não existe/);
    assert.match(event.evidence, /não expõe PID/);
    assert.match(event.evidence, /não foi encerrado/);
    assert.match(event.evidence, /passou 1\/1/);
    assert.equal(server.testAudit.passed, 5081);
    assert.equal(server.testAudit.total, 5145);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard({ ...statusData, events: [event] });
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, new RegExp(event.title));
});

test('server dependency audit reports zero known vulnerabilities but keeps deprecated dependencies pending', () => {
    const event = statusData.events.find(item => item.id === 'server-dependency-audit-2026-10-16-2108');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /não reportou pacote vulnerável/);
    assert.match(event.evidence, /zlib\.net-mutliplatform 1\.0\.8/);
    assert.match(event.evidence, /SRT\/ASS\/SSA passaram 5\/5/);
    assert.match(event.evidence, /não exercitam legenda comprimida/);
    assert.match(event.evidence, /compatibilidade Windows\/Linux verificada/);
    assert.match(event.evidence, /T6\.4 continua parcial/);
    assert.equal(server.status, 'in_progress');
    assert.equal(server.testAudit.failed, 0);
});

test('server Nebula STRM download scan records tests without claiming production homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-strm-scan-status-2026-10-16-2127');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /90\/90 passaram/);
    assert.match(event.evidence, /Smoke test de download real.*pendentes/);
});

test('server Nebula startup audit records the disabled global gate without claiming manual validation', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-startup-gate-2026-10-16-2136');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /Enabled=false/);
    assert.match(event.evidence, /Não foi observado se houve tentativa manual/);
    assert.match(event.evidence, /Smoke test manual.*pendentes/);
    assert.match(event.evidence, /não expôs suas linhas de comando/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Downloader Nebula sem início automático/);
});

test('server Nebula download scan progress records production reproduction and source validation', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-scan-progress-2026-10-16-2149');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /11m55 sem iniciar mídia/);
    assert.match(event.evidence, /571\/571 passou/);
    assert.match(event.evidence, /processa uma categoria por vez/);
    assert.match(event.evidence, /1\.077 avisos de analisadores/);
    assert.match(event.evidence, /tag v12\.1\.22.*bloqueio de cobrança na conta GitHub/);
    assert.match(event.evidence, /não existe GitHub Release baixável/);
    assert.match(event.evidence, /binário de produção continua 12\.1\.21/);
    assert.match(event.evidence, /Smoke test ponta a ponta.*pendentes/);
});

test('portal records title-level Nebula download startup without claiming production homologation', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-first-title-download-2026-10-16-2214');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /subdivide categorias diretas em pastas de título ordenadas A–Z/);
    assert.match(event.evidence, /574\/574 aprovad[oa]/);
    assert.match(event.evidence, /Model\.Tests 684\/684/);
    assert.match(event.evidence, /Server\.Implementations\.Tests 1\.437 aprovados, 60 ignorados/);
    assert.match(event.evidence, /zero falhas nos projetos reportados/);
    assert.match(event.evidence, /Integrações dependentes de Mongo.*foram ignoradas/);
    assert.match(event.evidence, /testes do portal no espelho 35\/35/);
    assert.match(event.evidence, /GitHub CLI sem autenticação/);
    assert.match(event.evidence, /nenhum worker de produção foi iniciado\/parado/);
    assert.match(event.evidence, /instalação segue 12\.1\.21/);
    assert.match(event.evidence, /homologação real e release permanecem pendentes/);
    assert.equal(server.status, 'in_progress');
    assert.equal(statusData.androidHomologation.formalSignoff, 'pending');

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula inicia o download após indexar o primeiro título/);
});

test('portal records real-library Nebula scan revalidation as partial', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-first-title-revalidation-2026-10-16-2248');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.deepEqual(event.featureIds, ['T0.3', 'T2.1']);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /Produção segue 12\.1\.21/);
    assert.match(event.evidence, /duas varreduras sem contagem ou Iniciando download/);
    assert.match(event.evidence, /120 títulos em Animações e um item elegível no primeiro título A–Z/);
    assert.match(event.evidence, /suíte NebulaPython 574\/574/);
    assert.match(event.evidence, /Nenhum download, Mongo\/Telegram, worker ou configuração de produção foi alterado/);
    assert.match(event.evidence, /Correção local não instalada/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Revalidar o início do primeiro download Nebula/);
});

test('portal records library refresh admission and downloader false-response feedback as partial', async () => {
    const event = statusData.events.find(item => item.id === 'server-library-refresh-nebula-start-feedback-2026-10-16-2233');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1', 'T6.2']);
    assert.match(event.evidence, /POST \/Library\/Refresh.*single-flight/);
    assert.match(event.evidence, /429\/Retry-After: 1/);
    assert.match(event.evidence, /false gera aviso/);
    assert.match(event.evidence, /126\/126/);
    assert.match(event.evidence, /574\/574/);
    assert.match(event.evidence, /Sem navegador real, teste de carga, download\/worker de produção/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Admissão de refresh global e feedback do downloader Nebula/);
});

test('portal records Nebula worker scan readiness without claiming first download or production homologation', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-worker-startup-readiness-2026-10-16-2308');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /primeiro item efetivamente enumerado pelo os\.walk/);
    assert.match(event.evidence, /647 aprovados, 21 ignorados, 0 falhas/);
    assert.match(event.evidence, /NebulaPython 576\/576/);
    assert.match(event.evidence, /não o primeiro download/);
    assert.match(event.evidence, /Produção e download Telegram reais não foram exercitados/);

});

test('portal records downloader startup handshake correction as partial until real download smoke test', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-downloader-ready-handshake-2026-10-17-0000');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /\[STRM-WORKER-READY\]/);
    assert.match(event.evidence, /refresh completo do índice Mongo/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests 10\/10 e NebulaPython 581\/581/);
    assert.match(event.evidence, /após 5m52s ainda não havia iniciado uma mídia/);
    assert.match(event.evidence, /Nenhuma transferência foi observada/);
    assert.match(event.evidence, /Primeiro download real, release e homologação permanecem pendentes/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Corrigir falso timeout no início do downloader Nebula/);
});

test('portal records that the installed Nebula worker predates the validated source fix', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-production-version-gap-2026-10-16-2326');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /System\/Info\/Public responde 12\.1\.21/);
    assert.match(event.evidence, /não contém a divisão incremental por título/);
    assert.match(event.evidence, /Enabled=false bloqueia o início automático/);
    assert.match(event.evidence, /4\.898\/4\.959.*61 ignorados, 0 falhas/);
    assert.match(event.evidence, /instalado em 08\/10\/2026.*reparse points/);
    assert.match(event.evidence, /NebulaPython 580\/580/);
    assert.match(event.evidence, /1\.445 aprovados, 60 ignorados/);
    assert.match(event.evidence, /Jellyfin\.Api\.Tests 674\/674/);
    assert.match(event.evidence, /RateLimitMiddlewareTests 92\/92/);
    assert.match(event.evidence, /web tests 407\/407/);
    assert.match(event.evidence, /sem host GitHub autenticado/);
    assert.match(event.evidence, /Nenhum worker ou transferência real/);
    assert.match(event.evidence, /não ativa em produção/);
    assert.equal(server.testAudit.passed, 5081);
    assert.equal(server.testAudit.total, 5145);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /produção ainda executa o scanner anterior à correção/);
});

test('portal records scheduled backup history coverage as partial', async () => {
    const event = statusData.events.find(item => item.id === 'server-backup-scheduled-history-2026-10-16-2355');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T4.4']);
    assert.match(event.evidence, /CreateScheduledBackupAsync/);
    assert.match(event.evidence, /FullSystemBackup 32\/32/);
    assert.match(event.evidence, /1\.446 aprovados, 60 ignorados, 0 falhas/);
    assert.match(event.evidence, /não valida execução do scheduler nem restore completo/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Cobrir persistência do histórico de backup agendado/);
});

test('portal records the rebuilt Nebula stage without claiming production download completion', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-stage-rebuilt-2026-10-17-0042');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /publish Release concluiu/);
    assert.match(event.evidence, /validate-stage\.ps1` passou/);
    assert.match(event.evidence, /C588DD2006A182440A57AC02D33730531E1FD0575FB3B971B6441D459FDAA88F/);
    assert.match(event.evidence, /VersionPrefix\/SharedVersion estão alinhados em 12\.1\.22/);
    assert.match(event.evidence, /581\/581/);
    assert.match(event.evidence, /10\/10/);
    assert.match(event.evidence, /Web, tray e installer foram pulados/);
    assert.match(event.evidence, /Produção segue 12\.1\.21/);
    assert.match(event.evidence, /Primeiro download real continua pendente/);
    assert.match(event.evidence, /Revalidação em 2026-10-17: HTTP local continua retornando 12\.1\.21/);
    assert.match(event.evidence, /startup \.NET 10\/10 e `validate-stage\.ps1` passou/);
});

test('portal does not treat HTTP 200 from StartDownloader as proof of a real download', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-installer-validation-2026-10-17-0101');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /StartDownloader respondeu HTTP 200 após 15,74 s/);
    assert.match(event.evidence, /HTTP 200 não comprova que o bool retornado foi true/);
    assert.match(event.evidence, /197\.082 arquivos STRM/);
    assert.match(event.evidence, /Enabled=false, que bloqueia o início automático/);
    assert.match(event.evidence, /ação manual StartDownloader é separada/);
    assert.match(event.evidence, /Não alterei a configuração/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests 10\/10 e Python scanner\/helpers 86\/86/);
    assert.match(event.evidence, /NebulaFtpControllerTests passaram 36\/36/);
    assert.match(event.evidence, /primeiro item\/transferência/);
    assert.match(event.evidence, /release v12\.1\.22 ainda não existe/i);
});

test('portal distinguishes the stale production Nebula runtime from validated source tests', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-runtime-mismatch-2026-10-17-0120');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /versão 12\.1\.21/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests 10\/10/);
    assert.match(event.evidence, /testes Python de scanner\/helpers 86\/86/);
    assert.match(event.evidence, /21 testes Category=RequiresMongo passaram/);
    assert.match(event.evidence, /Mongo de produção na 27017 não foi consultado/);
    assert.match(event.evidence, /1\.473 aprovados, 39 ignorados, 0 falhas \(1\.512 total\)/);
    assert.match(event.evidence, /Não houve instalação, restart/);
    assert.match(event.evidence, /primeiro download real não está validado/);
    assert.match(event.evidence, /fixtures destrutivos antes hardcoded em 127\.0\.0\.1:3306/);
    assert.match(event.evidence, /MULLETAFLIX_TEST_MARIADB_CONNECTION_STRING/);
    assert.match(event.evidence, /Validador: 8\/8; integração MariaDB: 37\/37/);
    assert.match(event.evidence, /14 aprovados e 23 ignorados/);
    assert.match(event.evidence, /porta 33099 fechada/);
});

test('portal records the latest Nebula and image API regression evidence without claiming production homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-audit-2026-10-17-0318');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /API local ainda reporta 12\.1\.21/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests: 10\/10/);
    assert.match(event.evidence, /Jellyfin\.Api\.Tests Release: 679\/679/);
    assert.match(event.evidence, /falha ao deletar imagem de usuário/);
    assert.match(event.evidence, /Ainda não houve smoke test Telegram real/);
    assert.match(event.evidence, /não havia processo worker no snapshot/);
    assert.match(event.evidence, /ou transferência/);
});

test('portal records the Supabase backup and Nebula upload admission race as an open audit', () => {
    const event = statusData.events.find(item => item.id === 'server-supabase-upload-admission-race-2026-10-17-0325');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T4.4']);
    assert.match(event.evidence, /sem reserva.*PerformBackupAsync/);
    assert.match(event.evidence, /três claims Python/);
    assert.match(event.evidence, /não compartilham gate/);
    assert.match(event.evidence, /não o interleaving/);
    assert.match(event.evidence, /Auditoria estática read-only/);
    assert.match(event.evidence, /Não se confirmou perda permanente/);
    assert.match(event.evidence, /barreira Mongo atômica comum a C#\/Python/);
});

test('portal records Mongo-backed validation without closing the upload-admission race', () => {
    const event = statusData.events.find(item => item.id === 'server-supabase-upload-race-revalidation-2026-10-17-0437');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T4.4']);
    assert.match(event.evidence, /três find_one_and_update/);
    assert.match(event.evidence, /16\/16 aprovados/);
    assert.match(event.evidence, /não cobre o interleaving backup-ocioso→claim/);
    assert.match(event.evidence, /Nenhuma produção, worker, configuração ou transferência alterada/);
});

test('portal shows the current stale Nebula runtime and failed stage integrity check', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-runtime-stage-recheck-2026-10-17-0510');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /servidor 12\.1\.21/);
    assert.match(event.evidence, /validate-stage\.ps1 falhou/);
    assert.match(event.evidence, /Jellyfin\.Server\.Implementations\.Tests 1452 aprovados, 62 ignorados, 0 falhas/);
    assert.match(event.evidence, /NebulaPython 584\/584/);
    assert.match(event.evidence, /Log local termina em 11\/10/);
    assert.match(event.evidence, /primeiro item/);
});

test('portal records the isolated Nebula stage candidate without claiming a full release', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-isolated-stage-candidate-2026-10-17-0518');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /Candidato isolado contém 3\.224 arquivos/);
    assert.match(event.evidence, /Integridade do stage passou/);
    assert.match(event.evidence, /Web\/tray foram preservados do stage-base/);
    assert.match(event.evidence, /isso não é uma release completa/);
    assert.match(event.evidence, /nenhum download real foi executado/);
});

test('portal records Nebula admission lease unit evidence without claiming release readiness', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-admission-lease-unit-tests-2026-10-17-0526');

    assert.ok(event, 'portal should publish this server validation update');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /1\.455 aprovados, 62 ignorados, 0 falhas/);
    assert.match(event.evidence, /NebulaPython 3\.10 584\/584/);
    assert.match(event.evidence, /Mongo real não executados/);
    assert.match(event.evidence, /Primeiro download real, pacote integral e gates de release pendentes/);
});

test('portal distinguishes the corrected Nebula source from the stale production runtime', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-runtime-recheck-2026-10-17-0544');

    assert.ok(event, 'portal should publish the latest Nebula runtime check');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /retornou 12\.1\.21/);
    assert.match(event.evidence, /25\/25/);
    assert.match(event.evidence, /87\/87/);
    assert.match(event.evidence, /não prova transferência real/);
    assert.match(event.evidence, /Pacote integral, instalação em janela aprovada e primeiro download seguem pendentes/);
});

test('portal publishes the isolated Mongo cancellation and upload-admission validation without claiming production approval', () => {
    const event = statusData.events.find(item => item.id === 'server-supabase-cancellation-mongo-validation-2026-10-17-0551');

    assert.ok(event, 'portal should publish the latest Supabase/Nebula validation');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T4.4']);
    assert.match(event.evidence, /21\/21 aprovados, 0 falhas/);
    assert.match(event.evidence, /Mongo descartável limitado a 127\.0\.0\.1:27099/);
    assert.match(event.evidence, /1\.481 aprovados, 39 ignorados, 0 falhas \(1\.520 total\)/);
    assert.match(event.evidence, /Mongo de produção 127\.0\.0\.1:27017 não foi tocado/);
    assert.match(event.evidence, /Nenhum backup Supabase remoto, transferência Telegram/);
    assert.match(event.evidence, /primeiro download/);
    assert.match(event.evidence, /T4\.4 permanece in_progress/);
});

test('portal records the rebuilt Nebula stage without claiming production installation or download success', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-stage-rebuilt-2026-10-17-0604');

    assert.ok(event, 'portal should publish the latest Nebula download verification');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /reconstruiu stage/i);
    assert.match(event.evidence, /validate-stage\.ps1.*passou/);
    assert.match(event.evidence, /Implementations 1\.458 aprovados\/62 ignorados\/0 falhas/);
    assert.match(event.evidence, /instalador foi pulado/);
    assert.match(event.evidence, /primeiro download real pendentes/);
});

test('portal records that the installer now receives the validated Nebula stage without claiming production is fixed', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-installer-stage-path-2026-10-17-0615');

    assert.ok(event, 'portal should publish the installer stage-path regression fix');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /não encaminhava -StageDirectory/);
    assert.match(event.evidence, /StageBuildOptions\.Tests\.ps1, Assert-StageIntegrity\.Tests\.ps1 e RcloneBootstrap\.Tests\.ps1/);
    assert.match(event.evidence, /continua 12\.1\.21/);
    assert.match(event.evidence, /primeiro download real ainda não estão corrigidos\/homologados/);
});

test('portal records latest Nebula scanner and readiness fixes without claiming a production download', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-mongo-handshake-2026-10-17-0728');

    assert.ok(event, 'portal should publish the Mongo readiness handshake correction');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /diretório superior desconhecido ou mídia solta/);
    assert.match(event.evidence, /Python focados 89\/89, suíte Python 586\/586/);
    assert.match(event.evidence, /somente \[STRM-SCAN-STARTED\] confirma início/);
    assert.match(event.evidence, /backup temporário usa a raiz do projeto/);
    assert.match(event.evidence, /confirma runtime 12\.1\.21/);
    assert.match(event.evidence, /Release, instalação e primeiro download real continuam pendentes/);
});

test('portal records the completed isolated stage validation without claiming a release or production download', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-stage-lock-validation-2026-10-17-0753');

    assert.ok(event, 'portal should publish current Nebula stage and test results');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /NebulaPython 586\/586/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests 9\/9/);
    assert.match(event.evidence, /1\.458 aprovados, 62 ignorados, 0 falhas/);
    assert.match(event.evidence, /stage Windows construído.*validado/i);
    assert.match(event.evidence, /NSIS existe, mas não foi gerado instalador/);
    assert.match(event.evidence, /Nenhuma instalação\/restart, worker ou download real ocorreu/);
});

test('portal records the installed Nebula worker missing its Mongo admission module', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-module-missing-2026-10-17-0803');

    assert.ok(event, 'portal should publish the reproduced Nebula startup cause');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /main\.py instalado importa tools\.mongo_admission, mas o arquivo falta/);
    assert.match(event.evidence, /ModuleNotFoundError: No module named 'tools\.mongo_admission'/);
    assert.match(event.evidence, /NebulaPython 586\/586; NebulaDownloaderStartupTests Release 9\/9/);
    assert.match(event.evidence, /Nenhum worker, instalação, restart, configuração ou mídia foi alterado/);
});

test('portal records current Nebula runtime, stage parity, and source-only test evidence without claiming production success', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-runtime-recheck-2026-10-17-0810');

    assert.ok(event, 'portal should publish the latest Nebula runtime recheck');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /runtime MulletaFlix 12\.1\.21/);
    assert.match(event.evidence, /fonte\/stage, que estão alinhados/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests Release 9\/9/);
    assert.match(event.evidence, /testes Python focados 89\/89 passaram/);
    assert.match(event.evidence, /não recebe atualização desde 11\/10\/2026/);
    assert.match(event.evidence, /não em produção/);
    assert.match(event.evidence, /transferência real continuam pendentes/);
});

test('portal reports the 12.1.24 Nebula candidate without claiming a successful download', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-stale-downloader-runtime-2026-10-17-1000');

    assert.ok(event, 'portal should publish the latest STRM downloader diagnosis');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /Candidato 12\.1\.24 (?:reconstruído|construído) localmente para Windows e Linux/);
    assert.match(event.evidence, /Tools\/NebulaPython\/tools\/strm_downloader\.py e requirements\.txt/);
    assert.match(event.evidence, /NebulaPython 89\/89(?: e|,) NebulaDownloaderStartupTests Release 11\/11/);
    assert.match(event.evidence, /produção continua 12\.1\.21/i);
    assert.match(event.evidence, /Release ainda não publicada/);
    assert.match(event.evidence, /Instalação controlada e smoke test permanecem pendentes/);
    assert.doesNotMatch(JSON.stringify(event), /[A-Z]:\\Users\\/i);
});

test('portal records the GitHub CI infrastructure block without miscounting it as test failure', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-release-ci-block-2026-10-17-1027');

    assert.ok(event, 'portal should publish the CI/release blocker');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /39036436583 e 39036616551/);
    assert.match(event.evidence, /11 jobs sem etapas executadas/);
    assert.match(event.evidence, /Não classificar como falha dos testes/);
    assert.match(event.evidence, /Release\/tag ainda não publicada/);
    assert.doesNotMatch(JSON.stringify(event), /[A-Z]:\\Users\\/i);
});

test('portal records full local validation without claiming a real Nebula download', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-full-validation-2026-10-17-0823');

    assert.ok(event, 'portal should publish the completed local validation evidence');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /dotnet test .* terminou com exit 0/);
    assert.match(event.evidence, /NebulaPython 586\/586/);
    assert.match(event.evidence, /74 arquivos e 407 testes passou/);
    assert.match(event.evidence, /não há confirmação de download Telegram\/Mongo real/);
    assert.match(event.evidence, /Runtime local permanece 12\.1\.21/);
});

test('portal records the isolated Windows release candidate without claiming production homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-windows-release-candidate-2026-10-17-0843');

    assert.ok(event, 'portal should publish the Windows 12.1.23 candidate evidence');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /instalador `mulletaflix_12\.1\.23_windows-x64\.exe` construídos com sucesso/);
    assert.match(event.evidence, /contém `Tools\/NebulaPython\/tools\/mongo_admission\.py`/);
    assert.match(event.evidence, /Teste de colisão recusou sobrescrita/);
    assert.match(event.evidence, /runtime segue 12\.1\.21/);
    assert.match(event.evidence, /build Linux, publicação da release e primeiro download continuam pendentes/);
});

test('portal reports the pushed server commit and blocks release on GitHub billing lock', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-windows-release-candidate-2026-10-17-0843');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /Commit do servidor `074607e9a87c881934ba4e61a994cb1b5d112af8` foi enviado ao main/);
    assert.match(event.evidence, /CI GitHub `39029908311` encerrou sem iniciar jobs/);
    assert.match(event.evidence, /conta bloqueada por problema de cobrança/);
    assert.match(event.evidence, /não foi criada tag/);
    assert.match(event.evidence, /build Linux, publicação da release e primeiro download continuam pendentes/);
});

test('portal records locally built Linux package and outstanding release gates', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-release-linux-built-github-billing-block-2026-10-17-0847');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /commit do servidor .* está no main/);
    assert.match(event.evidence, /Pacote Linux 12\.1\.23 construído localmente/);
    assert.match(event.evidence, /systemd-analyze e smoke Linux não executados em Windows/);
    assert.match(event.evidence, /conta bloqueada por cobrança/);
    assert.match(event.evidence, /gh sem sessão autenticada/);
    assert.match(event.evidence, /nenhuma tag\/release criada/);
    assert.match(event.evidence, /sem instalação, restart, worker ou download real/);
});

test('portal records the final GitHub Actions billing block without calling it a test result', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-release-ci-billing-repeat-2026-10-17-0854');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /CI run 39030347425/);
    assert.match(event.evidence, /0\/11 jobs iniciados/);
    assert.match(event.evidence, /account is locked due to a billing issue/);
    assert.match(event.evidence, /não é resultado de testes de código/);
    assert.match(event.evidence, /release\/tag não publicada/);
});

test('portal publishes the Nebula path-safety audit as partial and not production-homologated', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-path-safety-2026-10-17-0914');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T6.3']);
    assert.match(event.evidence, /NebulaPathSafetyTests` 4\/4/);
    assert.match(event.evidence, /664 aprovados, 23 ignorados, 0 falhas/);
    assert.match(event.evidence, /risco TOCTOU/);
    assert.match(event.evidence, /commit `02d6e01b1113db615956ee95827c6a8d0cb9226f`/);
    assert.match(event.evidence, /Sem instalação, restart, mídia ou validação de produção/);
});

test('portal records CPython 3.12 dependency fix and keeps release blocked by GitHub billing', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-cp312-wheel-validation-2026-10-17-1045');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /NebulaPython 587\/587/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests Release 11\/11/);
    assert.match(event.evidence, /1\.464 aprovados, 62 ignorados, 0 falhas/);
    assert.match(event.evidence, /407\/407 testes/);
    assert.match(event.evidence, /portal independente 57\/57, espelho 43\/43/);
    assert.match(event.evidence, /conta bloqueada por cobrança/);
    assert.match(event.evidence, /Sem tag\/release/);
    assert.match(event.evidence, /produção 12\.1\.21/);
});

test('portal keeps the Nebula download correction pending until the runtime is updated', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-runtime-version-revalidation-2026-10-17-1056');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /GET \/System\/Info\/Public respondeu 12\.1\.21/);
    assert.match(event.evidence, /fonte 12\.1\.24/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests 11\/11/);
    assert.match(event.evidence, /test_strm_downloader\.py \+ test_strm_downloader_helpers\.py 89\/89/);
    assert.match(event.evidence, /Nenhum worker, download, instalação.*ou restart executado/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('avatar admin routes publish denial and authorized-pipeline evidence without claiming production deployment', () => {
    const event = statusData.events.find(item => item.id === 'server-avatar-admin-authorization-2026-10-17-1108');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.front, 'Servidor / autorização de API');
    assert.match(event.evidence, /12\/12/);
    assert.match(event.evidence, /Matriz focada Nebula\+GetAvatar: 26\/26/);
    assert.match(event.evidence, /Jellyfin\.Api\.Tests Release: 706\/706/);
    assert.match(event.evidence, /não foi instalado nem liberado em produção|Sem instalação ou validação em produção/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula download remains pending while production uses the older worker runtime', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-runtime-stale-2026-10-17-1114');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /continua em 12\.1\.21/);
    assert.match(event.evidence, /fonte 12\.1\.24/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests Release 11\/11/);
    assert.match(event.evidence, /scanner\/helpers 89\/89/);
    assert.match(event.evidence, /Nenhum worker\/download real.*restart executado/);
    assert.match(event.evidence, /publicação, instalação e smoke test continuam pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula download revalidation distinguishes passing source tests from stale production runtime', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-runtime-revalidation-2026-10-17-1137');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /API local confirmou servidor 12\.1\.21/);
    assert.match(event.evidence, /fonte 12\.1\.24/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests Release 11\/11/);
    assert.match(event.evidence, /NebulaPython 587\/587/);
    assert.match(event.evidence, /tag v12\.1\.24 ausente.*gh sem sessão/);
    assert.match(event.evidence, /Não houve download real, instalação ou restart/i);
    assert.match(event.evidence, /release e smoke test real continuam pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: downloader de produção ainda usa runtime antigo/);
});

test('Nebula download recheck publishes passing source tests but keeps production and release gates open', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-runtime-recheck-2026-10-17-1222');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /produção 12\.1\.21/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests` Release 11\/11/);
    assert.match(event.evidence, /scanner\/helpers 89\/89/);
    assert.match(event.evidence, /candidato Windows SHA-256/);
    assert.match(event.evidence, /Linux SHA-256/);
    assert.match(event.evidence, /tag v12\.1\.24 ausente/);
    assert.match(event.evidence, /não está aplicada\/homologada em produção/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula live recheck records stale production log and no active downloader child', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-live-process-log-recheck-2026-10-17-1227');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /produção 12\.1\.21/);
    assert.match(event.evidence, /nebula\.log.*11\/10\/2026 23:22:32/i);
    assert.match(event.evidence, /nenhum processo Python\/STRM\/rclone descendente/i);
    assert.match(event.evidence, /não comprova.*motivo.*falha/i);
    assert.match(event.evidence, /não houve.*iniciar worker.*download.*instalação.*restart/i);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula download investigation distinguishes worker startup from long production scan', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-start-investigation-2026-10-17-1240');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /três workers iniciados e sem progresso de mídia aparente/);
    assert.match(event.evidence, /produção 12\.1\.21/);
    assert.match(event.evidence, /fonte 12\.1\.24/);
    assert.match(event.evidence, /Python 89\/89 e C# startup\/hosted service 26\/26/);
    assert.match(event.evidence, /Não foi disparada a fila completa/);
    assert.match(event.evidence, /release\/instalação e smoke test limitado ainda pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('STRM generator package gate rejects a stage missing the required module', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-strm-generator-stage-integrity-2026-10-17-1234');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T0.3']);
    assert.match(event.evidence, /Assert-StageIntegrity\.Tests\.ps1 passou/);
    assert.match(event.evidence, /StageBuildOptions\.Tests\.ps1 passou/);
    assert.match(event.evidence, /test_generate_strm\.py \+ test_control_plane_operations\.py: 27\/27/);
    assert.match(event.evidence, /T0\.3 permanece parcial/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula download runtime recheck keeps production and release gates explicit', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-runtime-recheck-2026-10-17-1943');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /produção 12\.1\.21/);
    assert.match(event.evidence, /NebulaPython 587\/587/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests Release 11\/11/);
    assert.match(event.evidence, /run 39037932557 terminou com falha/);
    assert.match(event.evidence, /sem runner atribuído ou etapas executadas/);
    assert.match(event.evidence, /Produção não corrigida\/homologada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula port collision log keeps production homologation open', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-port-collision-log-2026-10-17-2003');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /WinError 10048/);
    assert.match(event.evidence, /rclone saindo com código 0/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests Release 15\/15/);
    assert.match(event.evidence, /12\/12/);
    assert.match(event.evidence, /não registra mídia iniciando transferência/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula upload startup conflict keeps deployment and real download pending', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-upload-mode-port-conflict-2026-10-17-2016');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /WinError 10048/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests Release 15\/15/);
    assert.match(event.evidence, /22\/22/);
    assert.match(event.evidence, /restore\/concorrência Mongo isolados 20\/20/);
    assert.match(event.evidence, /Release não publicada\/instalada/);
    assert.match(event.evidence, /download real pendente/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula mount duplicate helper records deterministic result and keeps production gate open', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-mount-duplicate-result-fix-2026-10-17-2024');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /test_mount_drive_n\.py 3\/3/);
    assert.match(event.evidence, /NebulaPython 591\/591/);
    assert.match(event.evidence, /código 3 indica somente outro helper/);
    assert.match(event.evidence, /26\/26/);
    assert.match(event.evidence, /WinError 10048/);
    assert.match(event.evidence, /download real permanecem pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula downloader starts independently while automatic N drive retry stays gated by Envio', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-downloader-independent-start-2026-10-17-2037');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /StartDownloaderAsync/);
    assert.match(event.evidence, /retry automático de N: agora também é suprimido quando Envio\/FTP não está ativo/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests \+ NebulaHostedServiceConfigurationTests 35\/35/);
    assert.match(event.evidence, /1\.473 aprovados, 63 ignorados, 0 falhas/);
    assert.match(event.evidence, /colisão 2121 persiste/);
    assert.match(event.evidence, /smoke test de transferência e homologação de produção pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula production recheck publishes the stale runtime, port collision, and local test evidence', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-runtime-check-2026-10-18-0225');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /HTTP 200.*produção 12\.1\.21/);
    assert.match(event.evidence, /readiness antigo aceitando outro processo/);
    assert.match(event.evidence, /WinError 10048/);
    assert.match(event.evidence, /Python Nebula 592\/592/);
    assert.match(event.evidence, /Release 39\/39/);
    assert.match(event.evidence, /primeiro download real permanecem pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /produção segue 12\.1\.21; porta FTP impede validar o download/);
});

test('Nebula stream-only logs are not treated as proof that the STRM downloader started', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-streaming-vs-downloader-2026-10-18-0233');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /Modo Somente Streaming/);
    assert.match(event.evidence, /WinError 10048/);
    assert.match(event.evidence, /Não há \[STRM-WORKER-READY\]/);
    assert.match(event.evidence, /causa da ausência de marcadores permanece indeterminada/);
    assert.match(event.evidence, /smoke test de download real pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula downloader startup log recheck stays in progress without claiming production success', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-downloader-startup-log-recheck-2026-10-18-0314');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /Enabled=false/);
    assert.match(event.evidence, /autostart pulado/);
    assert.match(event.evidence, /StartDownloader não testa Enabled/);
    assert.match(event.evidence, /todas as raízes MonitorPaths por --sources/);
    assert.match(event.evidence, /não serve para smoke test de um título/);
    assert.match(event.evidence, /Nenhuma chamada manual ou operação de produção foi feita/);
    assert.match(event.evidence, /C# Debug focados 51\/51/);
    assert.match(event.evidence, /Python 3\.10 lifecycle\/downloader 23\/23/);
    assert.match(event.evidence, /T2\.1 segue pendente até teste em ambiente isolado ou autorização explícita para produção e transferência real/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula Downloader: log não comprova chamada do worker STRM/);
});

test('Nebula downloader disabled startup remains pending and does not imply manual start or production success', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-downloader-disabled-config-check-2026-10-18-0340');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /NebulaFTP está desabilitado na configuração/);
    assert.match(event.evidence, /POST StartDownloader.*antecedem o início do processo atual/);
    assert.match(event.evidence, /uma ação manual atual não foi executada nem confirmada/);
    assert.match(event.evidence, /poderá varrer e baixar itens de toda a pasta monitorada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula port collision log keeps production download homologation open', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-runtime-port-conflict-log-2026-10-18-0352');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /falham ao vincular `127\.0\.0\.1:2121` com WinError 10048/);
    assert.match(event.evidence, /Não aparecem `\[STRM-WORKER-READY\]`, `\[STRM-SCAN-STARTED\]`, título em fila ou transferência/);
    assert.match(event.evidence, /39\/39/);
    assert.match(event.evidence, /produção 12\.1\.21/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula autosave correction remains partial until a real STRM download is verified', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-autosave-download-check-2026-10-18-0403');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /autosaves preservam o Enabled persistido/);
    assert.match(event.evidence, /JavaScript 4\/4/);
    assert.match(event.evidence, /Python 3\.10 3\/3/);
    assert.match(event.evidence, /Release 39\/39/);
    assert.match(event.evidence, /não há readiness\/scan STRM, item de fila ou transferência/);
    assert.match(event.evidence, /nenhuma release foi criada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    assert.match(event.title, /autosave preserva Enabled/);
});

test('Nebula download startup log remains partial until runtime transfer is verified', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-start-runtime-log-2026-10-18-0427');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /Somente Streaming, que desativa feeder, fila e workers de upload/);
    assert.match(event.evidence, /WinError 10048/);
    assert.match(event.evidence, /startup\/configuração\/mount C# 45\/45/);
    assert.match(event.evidence, /ciclo de vida\/mount Python 9\/9/);
    assert.match(event.evidence, /suíte NebulaPython completa 592\/592/);
    assert.match(event.evidence, /execução global inconclusiva, não aprovada/);
    assert.match(event.evidence, /Nenhum serviço\/processo\/mount\/configuração.*nenhuma transferência real/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula Python mode promotion fix remains in progress until production transfer is verified', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-python-mode-promotion-fix-2026-10-18-0444');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /a promoção só encerrava o runtime antigo para a engine C#/);
    assert.match(event.evidence, /C# Nebula startup\/hosted\/mount Release passou 49\/49/);
    assert.match(event.evidence, /Python ciclo de vida\/health\/mount passou 16\/16/);
    assert.match(event.evidence, /GET read-only confirma produção 12\.1\.21/);
    assert.match(event.evidence, /homologação produtiva e release pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula Envio startup exception does not block downloader attempt and keeps production gate open', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-downloader-survives-envio-start-failure-2026-10-18-0542');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /WinError 10048/);
    assert.match(event.evidence, /continuar a tentativa independente do Downloader/);
    assert.match(event.evidence, /44\/44/);
    assert.match(event.evidence, /versão 12\.1\.21/);
    assert.match(event.evidence, /Release e download real seguem pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula stale runtime and preexisting drive stop mount retry loops without closing production gate', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-stale-runtime-mount-retries-2026-10-18-0600');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /WinError 10048/);
    assert.match(event.evidence, /código 4/);
    assert.match(event.evidence, /C# Release recompilado passou 29\/29/);
    assert.match(event.evidence, /Python 3\.10 test_mount_drive_n\.py passou 3\/3/);
    assert.match(event.evidence, /servidor local 12\.1\.21/);
    assert.match(event.evidence, /processo Python pré-existente escutando 2121\/2123/);
    assert.match(event.evidence, /release e smoke test real permanecem pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('GetAvatar user visibility source regression is complete while production and full HTTP gates stay open', () => {
    const fixed = statusData.features.find(item => item.id === 'T6.1.24');
    const productionGate = statusData.features.find(item => item.id === 'T6.1.23');
    const parent = statusData.features.find(item => item.id === 'T6.1');

    assert.ok(fixed);
    assert.equal(fixed.status, 'completed');
    assert.match(fixed.name, /controller 11\/11/);
    assert.match(fixed.name, /Release focal combinada 37\/37/);
    assert.match(fixed.name, /Pipeline HTTP completo da rota e produção seguem pendentes/);
    assert.equal(productionGate.status, 'pending');
    assert.equal(parent.status, 'pending');
    const rollback = statusData.features.find(item => item.id === 'T6.1.25');
    assert.ok(rollback);
    assert.equal(rollback.status, 'completed');
    assert.match(rollback.name, /12\/12/);
    assert.equal(statusData.coverage.completed, 328);
    assert.equal(statusData.coverage.pending, 65);
    assert.equal(statusData.coverage.total, 397);
    assert.ok(Date.parse(statusData.generatedAt) >= Date.parse('2026-10-18T07:11:36-03:00'));
});

test('Nebula pauses mount retries when another helper owns the lock and leaves production gate open', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-pause-conflicting-mount-retries-2026-10-18-0802');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /código 3 era considerado retryável/);
    assert.match(event.evidence, /NebulaMountRuntimeHealthTests 7\/7/);
    assert.match(event.evidence, /NebulaMount 18\/18/);
    assert.match(event.evidence, /não houve ação produtiva/i);
    assert.match(event.evidence, /produção, download real e release permanecem pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula Supabase admission audit reports evidence limits without claiming a stale lease', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-supabase-admission-audit-2026-10-18-0812');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T4.2']);
    assert.match(event.evidence, /592\/592/);
    assert.match(event.evidence, /Três testes C# Mongo compilaram e foram ignorados/);
    assert.match(event.evidence, /não identifica proprietário ou expiração da lease/);
    assert.match(server.testAudit.label, /592\/592/);
    assert.match(server.testAudit.label, /Homologação formal continua aberta/);
    assert.equal(statusData.coverage.pending, 65);
    assert.equal(statusData.coverage.inProgress, 4);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula download audit distinguishes historical streaming/FTP failure from current local test evidence', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-log-and-release-test-gate-2026-10-18-0841');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /Somente Streaming/);
    assert.match(event.evidence, /WinError 10048/);
    assert.match(event.evidence, /não contém marcadores de start\/readiness\/scan ou transferência/);
    assert.match(event.evidence, /teste focal EnvioStartupException_DoesNotPreventDownloaderFromStarting foi reexecutado e passou 1\/1/);
    assert.match(event.evidence, /MongoDB 7 descartável em 127\.0\.0\.1:27099/);
    assert.match(event.evidence, /testes Mongo foram ignorados na execução local/);
    assert.match(event.evidence, /EnvioStartupException_DoesNotPreventDownloaderFromStarting foi reexecutado e passou 1\/1/);
    assert.match(event.evidence, /Portal independente passou 87\/87/);
    assert.match(event.evidence, /CI remoto, revisão instalada, download real e release não foram executados/);
    assert.equal(server.testAudit.passed, 5081);
    assert.equal(server.testAudit.total, 5145);
    assert.equal(server.testAudit.skipped, 64);
    assert.equal(server.testAudit.failed, 0);
    assert.match(server.testAudit.label, /NebulaPython 592\/592/);
    assert.match(server.testAudit.label, /418\/418 testes em 75 arquivos/);
    assert.equal(statusData.coverage.pending, 65);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('public homologation data contains no absolute Windows user-profile paths', () => {
    const matchingFields = [];
    const userProfilePath = /[A-Za-z]:\\Users\\/i;
    const visit = (value, fieldPath = '$') => {
        if (typeof value === 'string') {
            if (userProfilePath.test(value)) matchingFields.push(fieldPath);
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((entry, index) => visit(entry, `${fieldPath}[${index}]`));
            return;
        }

        if (value && typeof value === 'object') {
            for (const [key, entry] of Object.entries(value)) visit(entry, `${fieldPath}.${key}`);
        }
    };

    visit(statusData);
    assert.deepEqual(matchingFields, []);
});
