import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const statusData = JSON.parse(readFileSync(new URL('../homologacao-status.json', import.meta.url), 'utf8'));
const dashboardSource = readFileSync(new URL('../homologacao.js', import.meta.url), 'utf8');

function createDashboard() {
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
            ? statusData
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

test('search, status filter and pagination expose the matching roadmap rows', async () => {
    const dashboard = createDashboard();
    await settleDashboard();

    dashboard.getElement('feature-search').value = 'T6.1';
    dashboard.getElement('feature-search').listeners.input();
    assert.match(dashboard.getElement('feature-table').innerHTML, /T6\.1/);
    const t61Count = statusData.features.filter(feature => `${feature.id} ${feature.name} ${feature.area}`.includes('T6.1')).length;
    assert.equal((dashboard.getElement('feature-table').innerHTML.match(/<tr>/g) || []).length, t61Count);
    assert.equal(dashboard.getElement('feature-page-status').textContent, `Itens 1–${t61Count} de ${t61Count}`);

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
    const dashboard = createDashboard();
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
    assert.equal(audit.passed, 4882);
    assert.equal(audit.total, 4943);
    assert.equal(audit.skipped, 61);
    assert.equal(audit.failed, 0);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula restrito às pastas de biblioteca configuradas/);
});

test('server audit publishes the complete local suite and preserves the remote CI blocker', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-ci-billing-block-2026-10-16-2039');
    const suiteEvent = statusData.events.find(item => item.id === 'server-full-solution-tests-release-build-2026-10-16-2051');

    assert.equal(server.status, 'in_progress');
    assert.match(server.testAudit.label, /4\.882 aprovados, 61 ignorados, 0 falhas/);
    assert.match(server.testAudit.label, /0 avisos e 0 erros/);
    assert.match(server.testAudit.label, /homologação formal permanece pendente/);
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
