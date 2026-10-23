import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const statusData = JSON.parse(readFileSync(new URL('../homologacao-status.json', import.meta.url), 'utf8'));
const dashboardSource = readFileSync(new URL('../homologacao.js', import.meta.url), 'utf8');
const dashboardHtml = readFileSync(new URL('../homologacao.html', import.meta.url), 'utf8');
const portalConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const sitemapSource = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
const previousBillingBlockerTitle = statusData.events.find(item => item.id === 'server-github-actions-runner-allocation-blocked-2026-10-19-1912').title;

test('portal reports latest local server regression separately from formal homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-full-regression-python-rerun-2026-10-23-1549');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.match(event.local, /5\.221\/5\.293.*72 ignorados.*688\/688/);
    assert.match(event.release, /Nenhuma release criada/);
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(statusData.serverHomologation.formalSignoff, 'pending');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal reports Nebula directory refresh retry without claiming release or formal gate credit', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-directory-refresh-retry-2026-10-23-1620');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /backoff exponencial de 5 s até 5 min/);
    assert.match(event.local, /NebulaDirectoryRefreshQueueTests 6\/6/);
    assert.match(event.release, /Nenhuma release/);
    assert.match(event.release, /2\/7 \(28,6%\), sem crédito novo/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
});

test('portal records disposable MariaDB restore and crash replay without claiming production sign-off', () => {
    const event = statusData.events.find(item => item.id === 'server-mariadb-restore-crash-replay-2026-10-23-1052');
    const server = statusData.tracks.find(track => track.id === 'server');
    const h02 = statusData.serverHomologation.areas.find(area => area.id === 'SRV-H02');
    const h03 = statusData.serverHomologation.areas.find(area => area.id === 'SRV-H03');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.match(event.local, /MariaDB 11\.4\.4 descartável.*4\/4/);
    assert.match(event.evidence, /encerramento real do processo.*replay/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(h02.status, 'completed');
    assert.equal(h03.status, 'in_progress');
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.equal(statusData.serverHomologation.formalSignoff, 'pending');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records Nebula prequeue retry and preserves formal gate and release status', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-staging-claim-recovery-2026-10-23-1252');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.local, /16\/16.*688\/688/);
    assert.match(event.evidence, /já alterado para uploading por worker não é revertido/);
    assert.match(event.evidence, /Mongo também falhar.*permanecer staging/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.equal(statusData.serverHomologation.formalSignoff, 'pending');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal resolves the localization test expectation and keeps open gates unchanged', () => {
    const event = statusData.events.find(item => item.id === 'server-localization-test-expectation-resolved-2026-10-23-1002');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /esperava catálogo US sem configurar MetadataCountryCode/);
    assert.match(event.evidence, /67\/67 aprovados/);
    assert.match(event.release, /Nenhuma/);
    assert.match(event.release, /TOCTOU\/ACL.*P0/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records provider live-test opt-in without changing formal homologation or release state', () => {
    const event = statusData.events.find(item => item.id === 'server-provider-live-tests-opt-in-2026-10-23-0957');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /849 aprovados, 13 ignorados, 0 falhas/);
    assert.match(event.evidence, /5 aprovados e 13 live ignorados/);
    assert.match(event.evidence, /Nenhum teste live foi habilitado/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal distinguishes TMDb image picker languages from automatic fallback', () => {
    const event = statusData.events.find(item => item.id === 'server-image-language-gallery-audit-2026-10-23-0941');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /pt,null,en/);
    assert.match(event.evidence, /Refresh visual.*permanecem pendentes/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records fail-closed remote image validation without claiming production or formal validation', () => {
    const event = statusData.events.find(item => item.id === 'server-remote-image-decoder-fail-closed-2026-10-23-0928');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /85\/85/);
    assert.match(event.evidence, /Jellyfin\.Providers\.Tests excluindo Integration passou 844\/844/);
    assert.match(event.evidence, /total desconhecido/);
    assert.match(event.evidence, /Sem provider\/CDN isolado/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records Supabase Retry-After coverage without claiming production or formal validation', () => {
    const event = statusData.events.find(item => item.id === 'server-supabase-retry-after-2026-10-23-0843');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /65\/65/);
    assert.match(event.evidence, /Sem chamadas reais ao Supabase\/MongoDB/);
    assert.match(event.release, /sujo e 8 commits atrás/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the restore ACL audit and failing broad regression without formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-toctou-ancestor-acl-audit-2026-10-23-0851');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /1\.557 aprovados, 66 ignorados e 1 falha em 1\.624/);
    assert.match(event.evidence, /esperado 56, atual 42/);
    assert.match(event.evidence, /não há teste determinístico de troca concorrente/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal publishes corrected localization regression totals without runtime or formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-localization-rating-default-test-2026-10-23-0907');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /MetadataCountryCode usa BR por padrão/);
    assert.match(event.evidence, /LocalizationManagerTests passou 67\/67/);
    assert.match(event.evidence, /5\.173 aprovados, 69 ignorados, 0 falhas\/5\.242/);
    assert.match(event.evidence, /Nenhuma alteração de runtime ou produção/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('homologation status JSON is not cached between portal publications', () => {
    const headerRule = portalConfig.headers.find(rule => rule.source === '/homologacao-status.json');

    assert.ok(headerRule);
    assert.equal(headerRule.headers.find(header => header.key === 'Cache-Control')?.value, 'no-store, max-age=0, must-revalidate');
});

test('portal records Supabase backup-history retry without claiming live or formal validation', () => {
    const event = statusData.events.find(item => item.id === 'server-supabase-backup-history-retry-2026-10-23-0836');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /regressão que antes falhava.*passou/);
    assert.match(event.evidence, /63\/63/);
    assert.match(event.evidence, /Nenhuma chamada real ao Supabase\/MongoDB/);
    assert.match(event.release, /Checkout do servidor permanece sujo e 8 commits atrás/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the global metadata language refresh regression without claiming production validation', () => {
    const event = statusData.events.find(item => item.id === 'server-tmdb-global-language-refresh-2026-10-23-0827');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /falhou antes da correção e passou depois/);
    assert.match(event.evidence, /40\/40/);
    assert.match(event.evidence, /86\/86/);
    assert.match(event.evidence, /Sem chamada real ao TMDb/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the broadened filesystem race audit without claiming mitigation', () => {
    const event = statusData.events.find(item => item.id === 'server-filesystem-race-audit-2026-10-23-0812');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /FullSystemBackup Release passou 62\/62/);
    assert.match(event.evidence, /gravação de letras, avatar\/rollback e sync\/download/);
    assert.match(event.evidence, /TOCTOU permanece P0/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records AvatarFileStore revalidation and its Linux unlink race as unresolved', () => {
    const event = statusData.events.find(item => item.id === 'server-avatar-handle-store-revalidation-2026-10-23-0818');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.local, /4 aprovados, 3 ignorados/);
    assert.match(event.evidence, /janela entre a revalidação e a remoção pelo nome/);
    assert.match(event.release, /testes determinísticos/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the repeated restore TOCTOU baseline without claiming the race is fixed', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-toctou-baseline-repeat-2026-10-23-0757');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /FullSystemBackup Release passou 62\/62/);
    assert.match(event.evidence, /risco TOCTOU continua aberto/);
    assert.match(event.evidence, /WSL\/Linux não instalado, Docker CLI indisponível/);
    assert.match(event.evidence, /MULLETAFLIX_TEST_MARIADB_CONNECTION_STRING não configurada/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records TMDb image-language regression evidence without claiming visual production validation', () => {
    const event = statusData.events.find(item => item.id === 'server-tmdb-image-language-rerun-2026-10-23-0802');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /passou 72\/72/);
    assert.match(event.evidence, /não houve chamada TMDb, refresh visual de Invasão Zumbi 2/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records server release 12.1.28 without claiming production homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-release-12-1-28-restore-crc-2026-10-21-0229');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.location, /BackupService\.RestoreBackupCoreAsync/);
    assert.match(event.evidence, /FullSystemBackup 33\/33/);
    assert.match(event.evidence, /90A5A5E83910DF55337369DA5BC6166EF293ACF62C3B86D9FB62F9CDDB1E72CE/);
    assert.match(event.evidence, /Build Linux ocorreu em Windows/);
    assert.match(event.evidence, /produção não foram homologados/);
    assert.match(event.evidence, /backup integral continua parcial/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the released custom Nebula token collection fix with validation limits', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-custom-bot-token-backup-2026-10-21-0250');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.scope, /coleção padrão e customizada/);
    assert.match(event.evidence, /backup\/restore.*2\/2/);
    assert.match(event.evidence, /suíte Nebula Release 730\/730/);
    assert.match(event.evidence, /127\.0\.0\.1:27099/);
    assert.match(event.evidence, /Backup integral continua parcial/);
    assert.match(event.evidence, /produção não foram homologados/);
    assert.match(event.release, /v12\.1\.29/);
    assert.match(event.release, /cd8dc8821b74e139c44a3cd1f681f40144ae0bc0/);
    assert.match(event.links[0], /releases\/tag\/v12\.1\.29/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal reports the incomplete full-system backup and reconciled EF database wiring', () => {
    const event = statusData.events.find(item => item.id === 'server-full-system-backup-coverage-audit-2026-10-21');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.location, /backup-coverage-audit\.md/);
    assert.match(event.evidence, /nove DbContexts de produção/);
    assert.match(event.evidence, /sete factories centrais recebem a mesma efCoreConfiguration/);
    assert.match(event.evidence, /DomainSchemaInitializer usa DatabaseNames\.Main/);
    assert.match(event.evidence, /IntroSkipper usa o banco mulletaflix_introskipper/);
    assert.match(event.evidence, /topologia física ativa não foi verificada/);
    assert.match(event.evidence, /Mongo Nebula permanece externo/);
    assert.match(event.evidence, /files.*nebula_admission.*users.*bot_tokens.*operation_replays.*stats/);
    assert.match(event.evidence, /stats.*opcional/);
    assert.match(event.evidence, /FullSystemBackup 33\/33/);
    assert.match(event.evidence, /Nenhum código runtime, banco ou produção alterado\/acessado/);
    assert.match(event.release, /Sem nova release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the current public server release and confirms there is no unreleased code diff', () => {
    const event = statusData.events.find(item => item.id === 'server-release-12-1-26-revalidated-2026-10-21-0008');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.location, /12\.1\.26\.md/);
    assert.match(event.evidence, /v12\.1\.26 como release pública/);
    assert.match(event.evidence, /não há correção de servidor não publicada/);
    assert.match(event.evidence, /Homologação formal.*pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records restore FK preflight coverage without inflating formal homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-fk-preflight-contract-2026-10-22-1910');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /39 FKs no total/);
    assert.match(event.evidence, /38 pertencem a entidades exportadas/);
    assert.match(event.evidence, /FullSystemBackup em Release passou 62\/62/);
    assert.match(event.evidence, /MariaDB descartável.*não foram validados/);
    assert.match(event.evidence, /Homologação formal do servidor continua 1\/7 \(14,3%\)/);
    assert.match(event.release, /Nenhuma/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records cancellation-aware test waits and remaining analyzer debt', async () => {
    const event = statusData.events.find(item => item.id === 'server-test-waits-runner-cancellation-2026-10-20-2142');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.location, /Jellyfin\.Api\.Tests/);
    assert.match(event.evidence, /passaram 283\/283/);
    assert.match(event.evidence, /passou 3\/3/);
    assert.match(event.evidence, /330 mensagens\/165 localizações para 304\/152/);
    assert.match(event.evidence, /12 usam `TestContext\.Current\.CancellationToken`/);
    assert.match(event.evidence, /duas limpezas em `finally` usam `CancellationToken\.None`/);
    assert.match(event.evidence, /Prazos de 5 s e assertions permaneceram iguais/);
    assert.match(event.evidence, /Sem runtime, instalação, produção ou release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Servidor: testes propagam cancelamento sem alongar timeouts/);
});

test('portal records notification brand fix in v12.1.28 and keeps live visual confirmation pending', () => {
    const event = statusData.events.find(item => item.id === 'server-media-notification-brand-icon-2026-10-20-2204');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, 90);
    assert.match(event.location, /notifications\.ts/);
    assert.match(event.evidence, /src\/assets\/branding\/icon\.png/);
    assert.match(event.evidence, /418\/418 em 75 arquivos/);
    assert.match(event.evidence, /6bb2362bc4529668ffdb5a1ea291f8775347c094/);
    assert.match(event.evidence, /release pública v12\.1\.28/);
    assert.match(event.evidence, /Confirmação visual.*pendente/);
    assert.match(event.release, /v12\.1\.28/);
    assert.match(event.links[0], /releases\/tag\/v12\.1\.28/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records Mongo-backed Nebula queue cancellation tests and remaining analyzer debt', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-queue-mongo-test-cancellation-2026-10-20-2018');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /zero erros/);
    assert.match(event.evidence, /zero avisos `xUnit1051`/);
    assert.match(event.evidence, /24 locais corrigidos/);
    assert.match(event.evidence, /22 operações passam `TestContext\.Current\.CancellationToken`/);
    assert.match(event.evidence, /dois `DropDatabaseAsync` em `finally` usam `CancellationToken\.None`/);
    assert.match(event.evidence, /passou 18\/18/);
    assert.match(event.evidence, /MongoDB 8\.3\.7 descartável em `127\.0\.0\.1:27099`/);
    assert.match(event.evidence, /372 registros e 186 localizações únicas/);
    assert.match(event.evidence, /MongoDB de produção não foi acessado/);
    assert.match(event.evidence, /Sem instalação, produção, release do servidor/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: testes Mongo da fila respeitam cancelamento/);
});

test('portal records cancellation coverage for the Nebula directory refresh queue tests', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-refresh-queue-test-cancellation-2026-10-20-2032');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.location, /NebulaDirectoryRefreshQueueTests\.cs$/);
    assert.match(event.evidence, /zero erros/);
    assert.match(event.evidence, /zero avisos `xUnit1051`/);
    assert.match(event.evidence, /Onze localizações únicas foram corrigidas/);
    assert.match(event.evidence, /175 localizações únicas `xUnit1051`/);
    assert.match(event.evidence, /5\/5 aprovados/);
    assert.match(event.evidence, /assertions, timeouts e comportamento da fila permaneceram iguais/);
    assert.match(event.evidence, /Nenhum runtime, instalação, produção ou release do servidor/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: testes da fila de refresh respeitam cancelamento/);
});

test('portal records cancellation coverage for the Nebula mount retry tests', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-mount-retry-test-cancellation-2026-10-20-2041');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.location, /NebulaMountRetryTests\.cs$/);
    assert.match(event.evidence, /zero `xUnit1051`/);
    assert.match(event.evidence, /165 localizações únicas/);
    assert.match(event.evidence, /passou 6\/6/);
    assert.match(event.evidence, /cinco suítes Nebula relacionadas passaram 65\/65/);
    assert.match(event.evidence, /15 outras ocorrências em sete arquivos/);
    assert.match(event.evidence, /Somente testes mudaram; sem instalação, runtime, produção ou release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: testes de retry de montagem respeitam cancelamento/);
});

test('portal publishes Nebula STRM test cancellation warning cleanup with remaining analyzer debt', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-strm-test-cancellation-2026-10-20-1045');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /TestContext\.Current\.CancellationToken/);
    assert.match(event.evidence, /NebulaStrmGeneratorTests` passou 2\/2/);
    assert.match(event.evidence, /395 avisos, 0 erros \(398 antes\)/);
    assert.match(event.evidence, /303 locais únicos `xUnit1051`, 193 em Nebula/);
    assert.match(event.evidence, /Outros avisos\/analisadores continuam pendentes/);
    assert.match(event.evidence, /Sem runtime, instalação, produção ou release alterados/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: cancelamento responsivo nos testes do gerador STRM/);
});

test('portal publishes Nebula playback-cache cancellation test result and remaining project warning debt', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-cache-cancellation-tests-2026-10-20-1947');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /Rebuild Release do projeto de testes terminou com exit 0/);
    assert.match(event.evidence, /NebulaPlaybackCacheTests \+ NebulaStrmGeneratorTests passaram 61\/61/);
    assert.match(event.evidence, /O arquivo do cache tem zero avisos xUnit1051/);
    assert.match(event.evidence, /478 registros de aviso correspondem a 239 localizações únicas xUnit1051, 129 em testes Nebula/);
    assert.match(event.evidence, /dívida nos demais testes permanece/);
    assert.match(event.evidence, /Nenhum código runtime, instalação, produção ou release foi alterado/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: testes STRM e cache respeitam cancelamento/);
});

test('portal records cancellation-aware Supabase sync tests without claiming a server release', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-supabase-test-cancellation-2026-10-20-2006');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /Rebuild Release.*exit 0, zero erros/);
    assert.match(event.evidence, /zero avisos `xUnit1051` em `NebulaSupabaseSyncTests\.cs`/);
    assert.match(event.evidence, /`FullyQualifiedName~NebulaSupabaseSyncTests` passou 50\/50/);
    assert.match(event.evidence, /snapshot amplo do servidor não foi alterado nem recontado/);
    assert.match(event.evidence, /Sem mudança runtime, instalação, produção ou release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: testes de sincronização Supabase respeitam cancelamento/);
});

test('portal publishes current GitHub Actions billing blocker separately from test outcomes', async () => {
    const event = statusData.events.find(item => item.id === 'server-github-actions-billing-runner-blocker-recheck-2026-10-20-0922');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'blocked');
    assert.match(event.evidence, /CI run 441/);
    assert.match(event.evidence, /Release v12\.1\.24/);
    assert.match(event.evidence, /The job was not started because your account is locked due to a billing issue/);
    assert.match(event.evidence, /não validou nem refutou o código\/testes/);
    assert.match(event.evidence, /22\/22 contratos Node de CI\/release passaram/);
    assert.match(event.evidence, /Oito harnesses PowerShell de packaging\/segurança também passaram \(8\/8\)/);
    assert.match(event.evidence, /não executa runners\/workflows remotos/);
    assert.match(event.evidence, /Linux nativo ou instalação elevada em VM limpa/);
    assert.match(event.evidence, /proprietário da conta precisa resolver a pendência de cobrança/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /CI remoto: bloqueio de cobrança impede validar o código/);
});

test('portal records when GitHub homologation updates have not reached Vercel production', async () => {
    const event = statusData.events.find(item => item.id === 'portal-production-deployment-stale-2026-10-20-0949');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /sem deployment Vercel para `origin\/main` em `7a8733a6fb7f939592506d4c4b91fdfd7c7a21ac`/);
    assert.match(event.evidence, /produção `READY` `dpl_BVW6TPbGPqqDVgb4tprqSHTSDvz9`/);
    assert.match(event.evidence, /commit `2f292cc4cd1ddb184cb9e303b268fb31d8a387aa`/);
    assert.match(event.evidence, /domínio público respondeu HTTP 200/);
    assert.match(event.evidence, /contém este evento/);
    assert.match(event.evidence, /sem deploy manual/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Portal: commits de homologação no Git ainda não chegaram à produção/);
});

test('portal records the focused Nebula lifecycle, cache and Supabase regression result', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-focused-regression-2026-10-20-0956');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /137 aprovados, 2 ignorados, 0 falhas\/139/);
    assert.match(event.evidence, /NebulaSupabaseRestoreMongoTests/);
    assert.match(event.evidence, /NebulaConfigPage\.test\.mjs`: 4\/4/);
    assert.match(event.evidence, /Nenhum banco externo/);
    assert.match(event.evidence, /produção ou release foi exercitado/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: regressão focal de lifecycle, cache e backup/);
});

test('portal records complete local Nebula implementation suite and its Mongo limits', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-implementations-suite-2026-10-20-1005');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /705 aprovados, 24 ignorados, 0 falhas\/729/);
    assert.match(event.evidence, /NebulaDownloaderStartupTests` focal passou 30\/30/);
    assert.match(event.evidence, /24 ignorados exigem MongoDB e não executaram/);
    assert.match(event.evidence, /listener somente em `27017`/);
    assert.match(event.evidence, /harness permite apenas `127\.0\.0\.1:27099`/);
    assert.match(event.evidence, /Nenhuma conexão ou escrita foi feita ao serviço existente/);
    assert.match(event.evidence, /não smoke de worker instalado/);
    assert.match(event.evidence, /produção ou release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: suíte completa de implementações revalidada/);
});

test('portal records the full Nebula suite passing with isolated Mongo opt-in', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-full-suite-mongo-optin-2026-10-20-1018');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /Category=RequiresMongo`: 24 aprovados, 0 ignorados\/falhas/);
    assert.match(event.evidence, /FullyQualifiedName~Nebula`: 729 aprovados, 0 ignorados\/falhas/);
    assert.match(event.evidence, /MongoDB 8\.3\.7 descartável/);
    assert.match(event.evidence, /bind `127\.0\.0\.1:27099`/);
    assert.match(event.evidence, /Serviço MongoDB existente permaneceu Running em 27017\/PID 4200, sem conexão/);
    assert.match(event.evidence, /CI Linux/);
    assert.match(event.evidence, /Pasta TEMP permanece porque o executor recusou remoção recursiva/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: suíte completa passou com Mongo isolado, zero skips/);
});

test('portal keeps the latest Vercel HEAD synchronization visibly blocked', async () => {
    const event = statusData.events.find(item => item.id === 'portal-head-sync-recheck-2026-10-20-0956');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'blocked');
    assert.match(event.evidence, /origin\/main.*26408af4546c0669d78b7d76eb0fd493fb61a2fe/);
    assert.match(event.evidence, /deployment Vercel observado é `READY` para `2f292cc4cd1ddb184cb9e303b268fb31d8a387aa`/);
    assert.match(event.evidence, /endpoint público HTTP 200 ainda devolve/);
    assert.match(event.evidence, /nenhum deploy manual foi iniciado/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Portal: HEAD do Git ainda não refletido na Vercel/);
});

test('portal publishes the Nebula dependency drift guard and remaining gates', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-hashed-lock-2026-10-20-0804');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /`requirements\.lock` universal fixa 61 distribuições com hashes/);
    assert.match(event.evidence, /suíte completa isolada Python 3\.10 658\/658/);
    assert.match(event.evidence, /compara 53 pins ativos antes de importar/);
    assert.match(event.evidence, /tenta reparar pelo lock antes de probes\/imports/);
    assert.match(event.evidence, /Instalação real hashada do lock em venv isolado Windows Python 3\.12\.14 passou/);
    assert.match(event.evidence, /Linux nativo, CI remota executável, smoke NSIS\/serviço, produção e release do servidor não ocorreram/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: lock hash-checked, drift e parser ausente corrigidos/);
});

test('portal records the isolated Windows helper smoke and the harness fallback incident', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-windows-helper-stage-smoke-2026-10-20-0837');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /selecionou Python 3\.12\.14 do venv após restringir o PATH/);
    assert.match(event.evidence, /Lock staged e fonte tiveram SHA-256 idêntico/);
    assert.match(event.evidence, /fallback para o interpretador Python 3\.14 do host, fora de venv, com user site habilitado/);
    assert.match(event.evidence, /baseline prévio integral, os demais deltas são desconhecidos/);
    assert.match(event.evidence, /Não foi executado o NSIS completo/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /helper Windows passou em stage isolado/);
});

test('image provider suite and real-media validation limit are published', async () => {
    const event = statusData.events.find(item => item.id === 'server-image-provider-suite-revalidation-2026-10-20-0132');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /MetadataServiceTests\|ItemImageProviderTests: 95 aprovados/);
    assert.match(event.evidence, /Jellyfin\.Providers\.Tests excluindo DramaFindsLiveIntegrationTests: 805 aprovados/);
    assert.match(event.evidence, /A classe excluída depende de API externa ao vivo/);
    assert.match(event.evidence, /não provam gravação física, ImageInfos\/ImageTags, endpoint HTTP ou renderização/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Imagens: Providers 805\/805; validação com mídia real pendente/);
});

test('portal publishes GetAvatar handle-relative file operations and current server suite evidence', async () => {
    const event = statusData.events.find(item => item.id === 'server-getavatar-handle-relative-persistence-2026-10-20-0055');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /GetAvatar\/AvatarFileStore: 38 aprovados, 3 testes Linux ignorados, 0 falhas\/41/);
    assert.match(event.evidence, /5\.070 Passed, 68 NotExecuted, 0 Failed\/5\.138/);
    assert.match(event.evidence, /dois projetos Integration não selecionaram casos/);
    assert.match(event.evidence, /janela.*unlinkat.*mesmo UID efetivo/);
    assert.match(event.evidence, /Linux não disponível.*macOS não suportado/);
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /GetAvatar usa handles relativos; gate Linux segue pendente/);
});

test('avatar catalog traversal guard and current server test totals are published', async () => {
    const event = statusData.events.find(item => item.id === 'server-avatar-catalog-path-containment-2026-10-19-2347');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /preservando link, alvo, item de catálogo e associação/);
    assert.match(event.evidence, /5\.064 aprovados, 65 ignorados, 0 falhas\/5\.129/);
    assert.match(event.evidence, /TOCTOU, ACL, HTTP\/MariaDB integrado/);
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /GetAvatar rejeita traversal e symlink/);
});

test('profile cleanup hardening reports path-safety fixes and pending MariaDB gate', async () => {
    const event = statusData.events.find(item => item.id === 'server-getavatar-cleanup-previous-profile-image-2026-10-19-2052');
    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /FileSystemHelper\.PathsEqual/);
    assert.match(event.evidence, /IsPathWithinRoot/);
    assert.match(event.evidence, /Focal Release 45\/45/);
    assert.match(event.evidence, /Jellyfin\.Api\.Tests 749\/749/);
    assert.match(event.evidence, /Server Integration 3 aprovados, 142 ignorados/);
    assert.match(event.evidence, /TOCTOU permanece/);
    assert.match(event.evidence, /CreateFileW\/SetFileInformationByHandle no Windows/);
    assert.match(event.evidence, /openat\/O_NOFOLLOW\/unlinkat no Linux/);
    assert.match(event.evidence, /nenhuma foi implementada nesta etapa/);
    assert.match(event.evidence, /política macOS/);
    assert.match(event.evidence, /manter homologação in_progress/);
    assert.match(event.evidence, /Sem release; manter homologação in_progress/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /GetAvatar limpa arquivo nativo anterior após substituição segura/);
});

test('profile image delete containment publishes full API suite and residual TOCTOU risk', async () => {
    const event = statusData.events.find(item => item.id === 'server-profile-image-delete-containment-2026-10-19-2129');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /DeleteUserImage recusa caminho externo/);
    assert.match(event.evidence, /RemoveUserAvatarAsync retém arquivo externo/);
    assert.match(event.evidence, /CleanOrphanedProfileImages ignora pasta de usuário symlinkada/);
    assert.match(event.evidence, /30\/30 testes focados Release/);
    assert.match(event.evidence, /Jellyfin\.Api\.Tests completa 752\/752/);
    assert.match(event.evidence, /TOCTOU permanece/);
    assert.match(event.evidence, /Sem MariaDB integrada, runtime instalado, produção ou Release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /preservam arquivos fora da pasta do usuário/);
});

test('Nebula CLI Mongo database fallback is recorded with local test limits', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-mongo-database-cli-fallback-2026-10-19-1817');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /58\/58/);
    assert.match(event.evidence, /646\/646 em 137,47 s/);
    assert.match(event.evidence, /strm_downloader\.py 77% e supabase_sync\.py 89%/);
    assert.match(event.evidence, /não foram acessados/);
    assert.match(event.evidence, /CI remota e smoke instalado continuam pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('update center runtime recheck records focused test result and unavailable local endpoint', () => {
    const event = statusData.events.find(item => item.id === 'server-update-center-endpoint-runtime-recheck-2026-10-19-1226');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /UpdateInfoControllerTests passou 6\/6, 0 falhas/);
    assert.match(event.evidence, /GET read-only .*System\/Info\/Public e \/System\/UpdateInfo foram recusadas por conexão/);
    assert.match(event.evidence, /não foi possível observar versão, configuração MulletaFlix_UPDATE_MANIFEST_URL ou resposta do endpoint/);
    assert.match(event.evidence, /Nenhum serviço foi iniciado, Release criada ou instalação alterada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('GetAvatar persistence and UserAvatar HTTP route publish local evidence and pending runtime gates', () => {
    const event = statusData.events.find(item => item.id === 'server-getavatar-config-lock-2026-10-19-1154');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /PreservesConcurrentConfigurationWrite falhava antes da correção/);
    assert.match(event.evidence, /AvatarControllerUserAvatarAuthorizationTests Release: 21\/21/);
    assert.match(event.evidence, /Build Release do plugin GetAvatar: 0 avisos, 0 erros/);
    assert.match(event.evidence, /EF Core InMemory: 1\/1/);
    assert.match(event.evidence, /MariaDB foi adicionado e compilou, mas ficou ignorado/);
    assert.match(event.evidence, /UserAvatarRoute_ReturnsImageThroughHttpPipelineWithoutCaching exercitou GET \/GetAvatar\/UserAvatar/);
    assert.match(event.evidence, /HTTP 200, image\/png, bytes do fixture, Cache-Control no-store/);
    assert.match(event.evidence, /persistência relacional MariaDB, instalação\/cliente e produção continuam pendentes/);
    assert.match(event.evidence, /Nenhuma Release ou instalação foi feita/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('cross-area server audit publishes focused verification and unresolved release blockers', async () => {
    const event = statusData.events.find(item => item.id === 'server-cross-area-audit-getavatar-web-2026-10-19-1132');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /branch\/tag v12\.1\.24 não tem objeto Release/);
    assert.match(event.evidence, /billing antes dos steps/);
    assert.match(event.evidence, /UpdateInfoControllerTests 6\/6 Release/);
    assert.match(event.evidence, /MetadataServiceTests\|ItemImageProviderRefreshTests 44\/44 Release/);
    assert.match(event.evidence, /AvatarControllerUserAvatarAuthorizationTests 19\/19 Release/);
    assert.match(event.evidence, /Vitest 418\/418 em 75 arquivos/);
    assert.match(event.evidence, /rollback XML do GetAvatar grava fora do lock privado/);
    assert.match(event.evidence, /concorrência abrangente e teste EF real de ImageInfo pendentes/);
    assert.match(event.evidence, /Nenhuma produção ou mídia real foi alterada/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Auditoria do servidor: atualização, capas, GetAvatar e web/);
});

test('update center recheck publishes the branch and GitHub Release distinction with current assets', async () => {
    const event = statusData.events.find(item => item.id === 'server-update-center-branch-release-recheck-2026-10-19-1036');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /Por padrão, UpdateInfoController consulta GitHub Releases/);
    assert.match(event.evidence, /MulletaFlix_UPDATE_MANIFEST_URL pode substituir/);
    assert.match(event.evidence, /configuração efetiva não foi inspecionada/);
    assert.match(event.evidence, /endpoint real \/System\/UpdateInfo não foi chamado/);
    assert.match(event.evidence, /GET \/releases\/tags\/v12\.1\.24 retorna HTTP 404/);
    assert.match(event.evidence, /\/releases\/latest continua v12\.1\.21/);
    assert.match(event.evidence, /mulletaflix-update-win-x64\.zip/);
    assert.match(event.evidence, /Nenhuma Release ou instalação criada/);
    assert.match(event.evidence, /run 39212993752 falhou no job de validação sem executar steps/);
    assert.match(event.evidence, /account is locked due to a billing issue/);
    assert.match(event.evidence, /runner_id=0 e steps vazios/);
    assert.match(event.evidence, /Logs já indisponíveis/);
    assert.match(event.evidence, /jobs de pacote Linux e publicação foram ignorados/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Centro de Atualizações: branch 12\.1\.24 não é Release publicável/);
});

test('image provider fallback gate is published without claiming production validation', () => {
    const event = statusData.events.find(item => item.id === 'server-image-candidate-fallback-2026-10-19-1100');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /ItemImageProviderTests Release passou 51\/51/);
    assert.match(event.evidence, /HTTP 502 e HttpRequestException/);
    assert.match(event.evidence, /loops singular \(Primary\) e múltiplo \(Backdrop\)/);
    assert.match(event.evidence, /falhas parciais seguem contabilizadas porque as URLs são imagens distintas/);
    assert.match(event.evidence, /Nenhum arquivo real, ImageInfos\/ImageTags, endpoint, renderização, serviço ou produção foi homologado\/alterado/);
    assert.match(event.evidence, /v12\.1\.24 não tem GitHub Release/);
});

test('GetAvatar rollback keeps UserAvatars non-null after failed persistence', async () => {
    const event = statusData.events.find(item => item.id === 'server-getavatar-null-mapping-rollback-2026-10-19-1033');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /TDD reproduziu o defeito/);
    assert.match(event.evidence, /regressão focal 1\/1 passou/);
    assert.match(event.evidence, /Jellyfin\.Api\.Tests Release filtrado FullyQualifiedName!~Integration 737\/737/);
    assert.match(event.evidence, /0 avisos e 0 erros, eliminando CS8601/);
    assert.match(event.evidence, /Nenhum teste EF real, instalação, produção ou Release executado/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /GetAvatar: rollback mantém lista de avatares válida/);
});

test('Mongo restore integration result is published with CI and remote-service limits explicit', async () => {
    const event = statusData.events.find(item => item.id === 'server-supabase-mongo-restore-2026-10-19-1017');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /24 aprovados, 0 ignorados e 0 falhas/);
    assert.match(event.evidence, /MongoDB local isolado 8\.3\.7/);
    assert.match(event.evidence, /chamadas HTTP do Supabase foram simuladas/);
    assert.match(event.evidence, /CI do projeto usa MongoDB 7\.0/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Supabase: restore Mongo validado em instância isolada/);
});

test('Supabase keyset pagination audit is published with Mongo and snapshot gates explicit', async () => {
    const event = statusData.events.find(item => item.id === 'server-supabase-keyset-pagination-2026-10-19-0935');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /limit=100, chave única ordenada e filtro gt/);
    assert.match(event.evidence, /citados e percent-encoded conforme gramática PostgREST/);
    assert.match(event.evidence, /56 aprovados, 2 ignorados.*0 falhas/);
    assert.match(event.evidence, /Offset de nebula_files e snapshot consistente.*pendentes/);
    assert.match(event.evidence, /não acessaram Supabase remoto/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Supabase: restore e reconciliação paginados por cursor/);
});

test('Nebula file restore keyset is published with partial-retry and Mongo limits explicit', async () => {
    const event = statusData.events.find(item => item.id === 'server-supabase-nebula-files-keyset-2026-10-19-0959');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /nebula_files.*id TEXT PRIMARY KEY/);
    assert.match(event.evidence, /id=gt\.<último id>/);
    assert.match(event.evidence, /59 aprovados, 2 ignorados, 0 falhas/);
    assert.match(event.evidence, /Lotes anteriores permanecem aplicados/);
    assert.match(event.evidence, /BulkUpsertRawDocsAsync permite retry idempotente/);
    assert.match(event.evidence, /Nenhum Supabase remoto, restore Mongo real/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Supabase: restore do catálogo Nebula por cursor/);
});

test('avatar concurrency and legacy FTP restore audit remains in history as newer events arrive', async () => {
    const event = statusData.events.find(item => item.id === 'server-avatar-concurrency-legacy-ftp-restore-2026-10-19-0901');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /teste focal final 18\/18/);
    assert.match(event.evidence, /preservando ACL e metadados ausentes/);
    assert.match(event.evidence, /598\/598/);
    assert.match(event.evidence, /789\/789/);
    assert.match(event.evidence, /1\.499 aprovados, 39 ignorados, 0 falhas/);
    assert.match(event.evidence, /cinco classes RequiresMongo excluídas/);
    assert.match(event.evidence, /porta 127\.0\.0\.1:27099 fechada/);
    assert.match(event.evidence, /essa execução não valida integração/);
    assert.match(event.evidence, /Nenhuma instalação, operação de restore, produção ou GitHub Release foi feita/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Reauditoria GetAvatar: validação por caminho não fecha corrida TOCTOU/);
    assert.ok(statusData.events.some(item => item.id === event.id), 'The older audit must remain in the published event history.');
});

test('Intro Skipper EF regression is published as source-validated and production-pending', () => {
    const event = statusData.events.find(item => item.id === 'server-introskipper-changeditems-ef-span-2026-10-18-1524');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, []);
    assert.match(event.evidence, /suíte completa IntroSkipper\.Integration\.Tests passou 38\/38/);
    assert.match(event.evidence, /Revisão adversarial final: sem achados/);
    assert.match(event.evidence, /versão do plugin em produção não verificada/);
    assert.match(event.evidence, /Revalidação nesta sessão: solução recompilada Release e suíte completa IntroSkipper\.Integration\.Tests passou 38\/38, 0 ignorados/);
    assert.match(event.evidence, /MariaDB descartável 11\.4\.4 em 127\.0\.0\.1:33681/);
    assert.match(event.evidence, /o log não informa versão e não confirma a causa operacional/);
    assert.match(event.evidence, /Nenhum release criado/);
});

test('homologation timeline keeps the newest event visible and retains older Intro Skipper evidence', async () => {
    const introEvent = statusData.events.find(item => item.id === 'server-introskipper-changeditems-ef-span-2026-10-18-1524');
    const dashboard = createDashboard();
    await settleDashboard();

    assert.ok(introEvent, 'older Intro Skipper evidence remains in the source history');
    assert.match(dashboard.getElement('event-list').innerHTML, /Revalidação local das suítes principais do servidor/);
});

test('image metadata audit records source correction without claiming production root cause', () => {
    const event = statusData.events.find(item => item.id === 'server-image-metadata-flow-audit-2026-10-18-1404');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T8.2']);
    assert.match(event.evidence, /compartilha os tipos de imagem singulares já salvos/);
    assert.match(event.evidence, /MetadataServiceTests 37\/37/);
    assert.match(event.evidence, /Jellyfin\.Providers\.Tests 798\/798/);
    assert.match(event.evidence, /uma vez, sem salvar outras Primary/);
    assert.match(event.evidence, /não comprova a causa de cada título/);
    assert.match(event.evidence, /sem release/);
});

test('server update center explains branch versus published release and records latest test gate', async () => {
    const event = statusData.events.find(item => item.id === 'server-update-center-branch-release-diagnosis-2026-10-19-0422');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /Por padrão, UpdateInfoController consulta a coleção GitHub/);
    assert.match(event.evidence, /MulletaFlix_UPDATE_MANIFEST_URL pode substituir/);
    assert.match(event.evidence, /configuração efetiva não foi inspecionada/);
    assert.match(event.evidence, /endpoint real \/System\/UpdateInfo não foi chamado/);
    assert.match(event.evidence, /releases\/tags\/v12\.1\.24.*HTTP 404/);
    assert.match(event.evidence, /44\/44 aprovados/);
    assert.match(event.evidence, /801\/802/);
    assert.match(event.evidence, /UpdateInfoControllerTests: 6\/6 aprovados/);
    assert.match(event.evidence, /39212993752/);
    assert.match(event.evidence, /API de jobs retorna steps vazios/);
    assert.match(event.evidence, /HTTP 403 Resource not accessible by integration/);
    assert.match(event.evidence, /não identifica a causa da falha original/);
    assert.match(event.evidence, /Nenhuma Release binária criada/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /12\.1\.24 está na branch\/tag, mas não tem GitHub Release/);
});

test('portal records avatar rollback reconciliation and its remaining validation limits', async () => {
    const event = statusData.events.find(item => item.id === 'server-getavatar-transactional-assignment-rollback-2026-10-19-0820');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /consulta novamente o usuário persistido/);
    assert.match(event.evidence, /17\/17/);
    assert.match(event.evidence, /735\/735/);
    assert.match(event.evidence, /LibraryBackgroundOperationGateTests/);
    assert.match(event.evidence, /não valida vínculo EF real/);
    assert.match(event.evidence, /gravação concorrente do XML/);
    assert.match(event.evidence, /Nenhuma instalação\/produção ou GitHub Release foi feita/);

    assert.ok(statusData.events.includes(event), 'portal keeps the historical avatar rollback event');
});

function createDashboard(data = statusData, workflowRuns = []) {
    const elements = new Map();
    const createElement = () => ({
        textContent: '',
        innerHTML: '',
        value: '',
        className: '',
        disabled: false,
        style: {},
        attributes: {},
        listeners: {},
        addEventListener(name, callback) {
            this.listeners[name] = callback;
        },
        setAttribute(name, value) {
            this.attributes[name] = String(value);
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
                ? { workflow_runs: workflowRuns }
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
    assert.match(dashboard.getElement('coverage-clarification').textContent, /331\/401.*não mede aprovação de testes, homologação formal nem prontidão de produção/);
    assert.match(dashboardHtml, /Itens concluídos no checklist do roadmap/);
    assert.match(dashboardHtml, /Não representa homologação formal/);
    assert.match(dashboard.getElement('feature-count').textContent, new RegExp(`^${statusData.features.length} tarefas`));
    assert.equal((dashboard.getElement('feature-table').innerHTML.match(/<tr>/g) || []).length, 25);
    assert.equal(dashboard.getElement('feature-page-number').textContent, `Página 1 de ${Math.ceil(statusData.features.length / 25)}`);
});

test('homologation timeline sorts newest events first without mutating source data', async () => {
    const events = [
        { title: 'Evento antigo', status: 'completed', updatedAt: '2026-10-18T10:00:00-03:00' },
        { title: 'Evento recente', status: 'in_progress', updatedAt: '2026-10-19T10:00:00-03:00' }
    ];
    const originalOrder = events.map(event => event.title);
    const dashboard = createDashboard({ ...statusData, events });
    await settleDashboard();

    const renderedEvents = dashboard.getElement('event-list').innerHTML;
    assert.ok(renderedEvents.indexOf('Evento recente') < renderedEvents.indexOf('Evento antigo'));
    assert.deepEqual(events.map(event => event.title), originalOrder);
});

test('homologation timeline renders the newest published status event first', async () => {
    const newestEvent = statusData.events.find(event => event.id === 'server-backup-mariadb-roundtrip-2026-10-21-0804');
    const previousGateEvent = statusData.events.find(event => event.id === 'server-release-gate-backup-e2e-pending-2026-10-21-0750');
    const implementationEvent = statusData.events.find(event => event.id === 'server-backup-domain-table-implementation-2026-10-21-0744');
    const latestRelease = statusData.events.find(event => event.id === 'server-release-12-1-34-backup-storage-test-isolation-2026-10-21-0714');
    const dashboard = createDashboard();
    await settleDashboard();

    assert.ok(newestEvent);
    assert.ok(previousGateEvent);
    assert.ok(implementationEvent);
    assert.ok(latestRelease);
    const renderedEvents = dashboard.getElement('event-list').innerHTML;
    assert.ok(renderedEvents.indexOf(newestEvent.title) >= 0);
    assert.equal(newestEvent.status, 'blocked');
    assert.match(newestEvent.evidence, /MariaDB 11\.4\.4 descartável/);
    assert.match(newestEvent.evidence, /3\/3 aprovados/);
    assert.match(newestEvent.evidence, /127\.0\.0\.1:3306 \(PID \d+\) não foi usado/);
    assert.match(newestEvent.evidence, /Nenhum pacote, commit ou release do servidor foi criado/);
    assert.ok(renderedEvents.indexOf(newestEvent.title) < renderedEvents.indexOf(previousGateEvent.title));
    assert.match(implementationEvent.evidence, /11 tabelas/);
    assert.match(latestRelease.evidence, /FullSystemBackup 40\/40/);
    assert.ok(renderedEvents.indexOf(previousGateEvent.title) < renderedEvents.indexOf(implementationEvent.title));
    assert.ok(renderedEvents.indexOf(implementationEvent.title) < renderedEvents.indexOf(latestRelease.title));
    assert.ok(renderedEvents.indexOf(latestRelease.title) < renderedEvents.indexOf(previousBillingBlockerTitle));
});

test('homologation timeline does not coerce an unknown progress percentage to zero', async () => {
    const dashboard = createDashboard();
    await settleDashboard();

    const renderedEvents = dashboard.getElement('event-list').innerHTML;
    const eventStart = renderedEvents.indexOf('Servidor: auditoria identifica cobertura parcial do backup integral');
    const eventEnd = renderedEvents.indexOf('</li>', eventStart);

    assert.notEqual(eventStart, -1);
    assert.notEqual(eventEnd, -1);
    assert.doesNotMatch(renderedEvents.slice(eventStart, eventEnd), /0%/);
});

test('portal publishes the latest local cross-language server regression audit', async () => {
    const event = statusData.events.find(item => item.id === 'server-broad-local-regression-audit-2026-10-19-1939');
    const server = statusData.tracks.find(track => track.id === 'server');
    const dashboard = createDashboard();
    await settleDashboard();

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /5\.110 resultados: 5\.045 aprovados, 65 ignorados e zero falhas/);
    assert.match(event.evidence, /646\/646 em 100,99 s/);
    assert.match(event.evidence, /NebulaPeriodicLoopTests` passou 2\/2 e `NebulaMountRuntimeHealthTests` 7\/7/);
    assert.match(event.evidence, /não valida integrações MariaDB nem pipeline HTTP de ponta a ponta/);
    assert.match(event.evidence, /MongoDB 8\.3\.7 descartável.*não o alvo CI 7\.0/);
    assert.match(event.evidence, /MariaDB Linux, CI remota, runtime instalado/);
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    const renderedEvents = dashboard.getElement('event-list').innerHTML;
    assert.ok(renderedEvents.indexOf(event.title) >= 0);
    assert.ok(renderedEvents.indexOf(event.title) < renderedEvents.indexOf(previousBillingBlockerTitle));
});

test('portal publishes the isolated Mongo and Nebula frontend validation without overstating CI coverage', async () => {
    const event = statusData.events.find(item => item.id === 'server-mongo-isolated-nebula-frontend-audit-2026-10-19-1952');
    const dashboard = createDashboard();
    await settleDashboard();

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /MongoDB 8\.3\.7 temporário/);
    assert.match(event.evidence, /24\/24/);
    assert.match(event.evidence, /não o alvo CI 7\.0|MongoDB 7\.0 do CI/);
    assert.match(event.evidence, /NebulaConfigPage\.test\.mjs.*4\/4/);
    assert.match(event.evidence, /não é teste de browser/);
    assert.match(event.evidence, /MariaDB Linux.*não foram testados/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    const renderedEvents = dashboard.getElement('event-list').innerHTML;
    assert.ok(renderedEvents.indexOf(event.title) >= 0);
    assert.ok(renderedEvents.indexOf(event.title) < renderedEvents.indexOf(previousBillingBlockerTitle));
});

test('portal publishes local CI packaging contract results without claiming remote jobs ran', async () => {
    const event = statusData.events.find(item => item.id === 'server-ci-packaging-contracts-audit-2026-10-19-1957');
    const dashboard = createDashboard();
    await settleDashboard();

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /node --test tools\/release\/tests\/\*\.test\.mjs/);
    assert.match(event.evidence, /19\/19, zero skips\/falhas/);
    assert.match(event.evidence, /job MariaDB Linux.*Mongo CI 7\.0/);
    assert.match(event.evidence, /não executa o GitHub Actions/);
    assert.match(event.evidence, /39212993752.*runner_id=0.*sem steps.*dois jobs.*skipped/);
    assert.match(event.evidence, /a causa não foi inferida/);
    assert.match(event.evidence, /WSL não instalado/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    const renderedEvents = dashboard.getElement('event-list').innerHTML;
    assert.ok(renderedEvents.indexOf(event.title) >= 0);
    assert.ok(renderedEvents.indexOf(event.title) < renderedEvents.indexOf(previousBillingBlockerTitle));
});

test('portal reports local integration-suite passes and skips without claiming MariaDB coverage', async () => {
    const event = statusData.events.find(item => item.id === 'server-local-integration-projects-audit-2026-10-19-2001');
    const dashboard = createDashboard();
    await settleDashboard();

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /IntroSkipper\.Integration\.Tests.*14 aprovados, 25 ignorados, 0 falhas/);
    assert.match(event.evidence, /Jellyfin\.Server\.Integration\.Tests.*3 aprovados, 141 ignorados, 0 falhas/);
    assert.match(event.evidence, /não constituem aprovação da integração MariaDB nem do pipeline HTTP completo/);
    assert.match(event.evidence, /serviço padrão não foi acessado/);
    assert.match(event.evidence, /WSL não instalado/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    const renderedEvents = dashboard.getElement('event-list').innerHTML;
    assert.ok(renderedEvents.indexOf(event.title) >= 0);
    assert.ok(renderedEvents.indexOf(event.title) < renderedEvents.indexOf(previousBillingBlockerTitle));
});

test('publishes the latest Nebula startup finding without marking T2.1 complete', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-live-runtime-promotion-2026-10-18-0827');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /95\/95/);
    assert.match(event.evidence, /sem download real/i);
});

test('publishes complete Mongo-backed CI selection without claiming integration passed', () => {
    const event = statusData.events.find(item => item.id === 'server-ci-mongo-category-filter-2026-10-18-1138');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T0.3']);
    assert.match(event.evidence, /Category=RequiresMongo/);
    assert.match(event.evidence, /24 casos/);
    assert.match(event.evidence, /Timeout preventivo ampliado para 15 minutos/);
    assert.match(event.evidence, /tags das cinco classes atuais/);
    assert.match(event.evidence, /ficaram ignorados/);
    assert.match(event.evidence, /CI remoto/);
});

test('records downloader readiness after Mongo and before potentially slow library discovery', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-mongo-ready-before-library-discovery-2026-10-18-1003');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /timeout de startup de 60 segundos/);
    assert.match(event.evidence, /C# 30\/30 e Python 3\.10 test_strm_downloader\.py 17\/17/);
    assert.match(event.evidence, /Nenhuma instalação, reinicialização ou transferência produtiva/);
});

test('keeps downloader UI/runtime discrepancy in progress until a real transfer is proven', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-ui-runtime-recheck-2026-10-18-1026');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /Download está Parado/);
    assert.match(event.evidence, /POST NebulaFtp\/Actions\/StartDownloader/);
    assert.match(event.evidence, /12\.1\.21/);
    assert.match(event.evidence, /47\/47/);
    assert.match(event.evidence, /não foi iniciado/);
    assert.match(event.evidence, /transferência real, T2\.1 e release seguem pendentes/);
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

test('server restore transaction records isolated MariaDB rollback validation without closing formal homologation', async () => {
    const event = statusData.events.find(item => item.id === 'server-backup-restore-transaction-boundary-2026-10-21-1226');
    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /FullSystemBackup Release 40\/40/);
    assert.match(event.evidence, /BackupRestoreMariaDbTests: 4\/4 aprovados contra MariaDB 11\.4\.4 descartável/);
    assert.match(event.evidence, /rollback por erro SQL injetado com preservação do arquivo/);
    assert.match(event.evidence, /serviço da aplicação em 127\.0\.0\.1:3306 permaneceu intocado/);
    assert.match(event.evidence, /Nebula suggestions 14\/14; NebulaUploadEngine 224\/224/);
    assert.match(event.evidence, /0 avisos e 0 erros/);
    assert.match(event.evidence, /filesystem após commit não é atomicamente transacional/);
    assert.match(event.evidence, /homologação formal global permanece 2\/7 gates \(28,6%\)/);
    assert.match(event.evidence, /Patch sem commit\/release do servidor/);

    const dashboard = createDashboard();
    await settleDashboard();
    const rendered = dashboard.getElement('event-list').innerHTML;
    assert.ok(rendered.indexOf(event.title) >= 0);
});

test('server backup history remains uncredited until cross-context evidence is reconciled', () => {
    const event = statusData.events.find(item => item.id === 'server-backup-cross-context-rollback-2026-10-21-1416');
    const relationalRestore = statusData.serverHomologation.areas.find(area => area.id === 'SRV-H02');
    const fullRecovery = statusData.serverHomologation.areas.find(area => area.id === 'SRV-H03');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.title, /sob reconciliação/);
    assert.match(event.evidence, /BackupRestoreMariaDbTests passou 6\/6/);
    assert.match(event.evidence, /falhas SQL injetadas em ActivityLogs, Series e Books/);
    assert.match(event.evidence, /Jellyfin.Server.csproj passou com 0 avisos e 0 erros/);
    assert.match(event.evidence, /MariaDB operacional em 127\.0\.0\.1:3306 não foi acessada/);
    assert.match(event.evidence, /Patch local sem commit\/release/);

    assert.equal(relationalRestore.status, 'completed');
    assert.match(relationalRestore.evidence, /BackupRestoreMariaDbTests passou 4\/4/);
    assert.match(relationalRestore.evidence, /MariaDB 11\.4\.4 descartável/);
    assert.equal(fullRecovery.status, 'in_progress');
    assert.match(fullRecovery.evidence, /Journal durável e replay após crash/);
    assert.match(fullRecovery.evidence, /TOCTOU por pathname permanece P0/);
    assert.match(fullRecovery.evidence, /homologação técnica global 2\/7 \(28,6%\)/);
    assert.equal(statusData.serverHomologation.formalSignoff, 'pending');
    assert.equal(statusData.tracks.find(track => track.id === 'server').homologation.percent, 28.6);
});

test('server keeps historical five-context snapshot claim visible but unverified', () => {
    const event = statusData.events.find(item => item.id === 'server-backup-consistent-snapshot-2026-10-21-1433');
    const fullRecovery = statusData.serverHomologation.areas.find(area => area.id === 'SRV-H03');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.title, /Evidência histórica sob reconciliação/);
    assert.match(event.evidence, /transação RepeatableRead/);
    assert.match(event.evidence, /versão pré-concorrência em todos/);
    assert.match(event.evidence, /BackupRestoreMariaDbTests 6\/6/);
    assert.match(event.evidence, /FullSystemBackup Release 42\/42/);
    assert.match(event.evidence, /0 avisos e 0 erros/);
    assert.match(event.evidence, /homologação formal global permanece 2\/7 gates \(28,6%\)/);
    assert.match(event.evidence, /sem commit\/release/);

    assert.equal(fullRecovery.status, 'in_progress');
    assert.match(fullRecovery.evidence, /Journal durável e replay após crash/);
    assert.match(fullRecovery.evidence, /homologação técnica global 2\/7 \(28,6%\)/);
    assert.equal(statusData.serverHomologation.formalSignoff, 'pending');
});

test('portal records the local manifest and PlaybackReports correction without granting formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-fullsystembackup-manifest-playbackreports-2026-10-22-0124');
    const server = statusData.tracks.find(track => track.id === 'server');
    const h02 = statusData.serverHomologation.areas.find(area => area.id === 'SRV-H02');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /BackupServiceTests 34\/34/);
    assert.match(event.evidence, /round-trip novo não executou/);
    assert.match(event.evidence, /nomes físicos/);
    assert.match(event.evidence, /PlaybackReports mapeia para PlaybackReport/);
    assert.match(h02.evidence, /PlaybackReports mapeia para PlaybackReport/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.equal(statusData.serverHomologation.formalSignoff, 'pending');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal publishes multi-context restore as local work and retains MariaDB and crash-recovery gates', () => {
    const event = statusData.events.find(item => item.id === 'server-fullsystembackup-multicontext-restore-2026-10-22-0220');
    const h03 = statusData.serverHomologation.areas.find(area => area.id === 'SRV-H03');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /BackupServiceTests: 37\/37/);
    assert.match(event.evidence, /multi-contexto não executado/);
    assert.match(event.evidence, /não é crash-safe/);
    assert.match(h03.evidence, /TOCTOU por pathname permanece P0/);
    assert.equal(statusData.serverHomologation.formalSignoff, 'pending');
});

test('formal server homologation consolidates gates, percentage, evidence and pending production signoff', async () => {
    const dashboard = createDashboard();
    await settleDashboard();

    const areas = statusData.serverHomologation.areas;
    const server = statusData.tracks.find(track => track.id === 'server');
    const rendered = dashboard.getElement('server-homologation-table').innerHTML;
    const completed = areas.filter(area => area.status === 'completed').length;
    const percent = Math.round((completed / areas.length) * 1000) / 10;

    assert.equal(areas.length, 7);
    assert.equal(completed, 2);
    assert.equal(areas.filter(area => area.status === 'in_progress').length, 1);
    assert.equal(areas.filter(area => area.status === 'pending').length, 3);
    assert.equal(areas.filter(area => area.status === 'blocked').length, 1);
    assert.equal(percent, 28.6);
    assert.equal(statusData.serverHomologation.formalSignoff, 'pending');
    assert.deepEqual(server.homologation, {
        completed: 2,
        total: 7,
        percent: 28.6,
        unit: 'gates formais igualmente ponderados',
        label: '2 de 7 gates com evidência técnica local validada; 1 em andamento, 3 pendentes e 1 bloqueado. SRV-H02 validado em MariaDB descartável; aceite formal de produção permanece pendente.'
    });
    assert.match(dashboard.getElement('server-homologation-percent').textContent, /^28\.6%$/);
    assert.equal(dashboard.getElement('server-homologation-progress-bar').style.width, '28.6%');
    assert.equal(dashboard.getElement('server-homologation-progress').attributes['aria-valuenow'], '28.6');
    assert.match(dashboard.getElement('server-homologation-state').textContent, /2\/7 gates concluídos · 1 em andamento · 3 pendentes · 1 bloqueado · aceite formal pendente/);
    assert.match(dashboard.getElement('track-summary-table').innerHTML, /28\.6%/);
    assert.match(dashboard.getElement('track-grid').innerHTML, /Homologação formal: 28\.6%/);
    assert.match(dashboard.getElement('track-grid').innerHTML, /Auditoria: 5241\/5494 · 95\.4%/);
    assert.match(rendered, /CI remota e matriz das plataformas suportadas/);
    assert.match(rendered, /runner_id=0 e steps vazios/);
    assert.match(rendered, /Aceite formal do servidor e da operação/);
    assert.equal((rendered.match(/<tr>/g) || []).length, 7);
    for (const area of areas) {
        assert.match(rendered, new RegExp(area.id));
        assert.ok(rendered.includes(area.name), `portal must show ${area.id} name`);
        assert.ok(rendered.includes(area.evidence), `portal must show ${area.id} evidence`);
    }

    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.equal(server.testAudit.percent, 95.4);
    assert.match(server.testAudit.label, /5\.241 aprovados, 253 ignorados/);
    assert.match(dashboardHtml, /Matriz formal · Servidor/);
    assert.match(dashboardHtml, /não a porcentagem de testes automatizados nem aceite de produção/);
    assert.match(dashboardHtml, /homologacao-servidor\.html/);
    assert.ok(portalConfig.rewrites.some(route => route.source === '/homologacao-servidor' && route.destination === '/homologacao-servidor.html'));
    assert.match(sitemapSource, /https:\/\/mulletaflix-portal\.vercel\.app\/homologacao-servidor/);
    const formalPage = readFileSync(new URL('../homologacao-servidor.html', import.meta.url), 'utf8');
    assert.match(formalPage, /Homologação formal do/);
    assert.match(formalPage, /CI remota\/plataformas/);
    assert.match(formalPage, /Dois dos sete gates com evidência técnica local validada \(28,6%\)/);
    assert.match(formalPage, /BackupRestoreMariaDbTests` passar 4\/4 em MariaDB 11\.4\.4 descartável/);
});

test('GitHub workflow runs are assigned only to the matching product front', async () => {
    const runs = [
        { name: 'Web client typecheck & lint', status: 'completed', conclusion: 'success', created_at: '2026-10-21T10:00:00Z', updated_at: '2026-10-21T10:01:00Z' },
        { name: 'Android client tests & assemble', status: 'completed', conclusion: 'success', created_at: '2026-10-21T10:02:00Z', updated_at: '2026-10-21T10:03:00Z' },
        { name: 'Server build & unit tests', status: 'completed', conclusion: 'failure', created_at: '2026-10-21T10:04:00Z', updated_at: '2026-10-21T10:05:00Z' }
    ];
    const dashboard = createDashboard(statusData, runs);
    await settleDashboard();
    const cards = dashboard.getElement('track-grid').innerHTML;

    assert.match(cards, /Frontend Web/);
    assert.match(cards, /Android client tests &amp; assemble/);
    assert.match(cards, /Server build &amp; unit tests/);
    assert.match(cards, /Falhou · Server build/);
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
    const dashboard = createDashboard({ ...statusData, events: [blockedEvent] });
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
    assert.equal(audit.passed, 5241);
    assert.equal(audit.total, 5494);
    assert.equal(audit.skipped, 253);
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

    const dashboard = createDashboard({ ...statusData, events: [event] });
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

test('server audit preserves the remote CI blocker and displays the latest Mongo CI audit', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-ci-billing-block-2026-10-16-2039');
    const suiteEvent = statusData.events.find(item => item.id === 'server-full-solution-tests-release-build-2026-10-16-2051');
    const mongoEvent = statusData.events.find(item => item.id === 'server-ci-mongo-category-filter-2026-10-18-1138');
    const priorBroadSuite = statusData.events.find(item => item.id === 'server-dotnet-broad-suite-mongo-gate-2026-10-19-1900');

    assert.equal(server.status, 'in_progress');
    assert.match(server.testAudit.label, /5\.120.*5\.356/);
    assert.match(server.testAudit.label, /Auditoria automatizada não equivale à homologação formal; release mais recente registrada: v12\.1\.35/);
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
    assert.ok(priorBroadSuite);
    assert.match(priorBroadSuite.evidence, /5\.069 aprovados, 41 ignorados, 0 falhas \(5\.110 resultados\)/);

    const dashboard = createDashboard({ ...statusData, events: [mongoEvent] });
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /seleção completa dos testes RequiresMongo/);
});

test('portal records the current deterministic server suite without claiming integration or production validation', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-server-suite-gate-2026-10-18-0247');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.match(server.testAudit.label, /passou com exit 0/);
    assert.match(event.evidence, /NebulaPython.*592\/592/);
    assert.match(event.evidence, /não tiveram testes correspondentes ao filtro/);
    assert.match(event.evidence, /Nenhuma release de servidor criada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard({ ...statusData, events: [event] });
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
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
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

    const dashboard = createDashboard({ ...statusData, events: [event] });
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

    const dashboard = createDashboard({ ...statusData, events: [event] });
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

    const dashboard = createDashboard({ ...statusData, events: [event] });
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

    const dashboard = createDashboard({ ...statusData, events: [event] });
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
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);

    const dashboard = createDashboard({ ...statusData, events: [event] });
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

    const dashboard = createDashboard({ ...statusData, events: [event] });
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

test('portal records scan-only downloader readiness and keeps production validation open', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-strm-scan-readiness-2026-10-18-0907');

    assert.ok(event, 'portal should publish the scan-readiness correction');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /somente STRM-SCAN-STARTED confirma prontidão/);
    assert.match(event.evidence, /30\/30/);
    assert.match(event.evidence, /17\/17/);
    assert.match(event.evidence, /Nenhum Mongo\/Telegram real, download, instalação ou restart foi testado/);
});

test('portal records the expanded STRM startup and mount retest without claiming production success', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-strm-scan-readiness-validation-2026-10-18-0910');

    assert.ok(event, 'portal should publish the expanded regression retest');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /59\/59/);
    assert.match(event.evidence, /20\/20/);
    assert.match(event.evidence, /88\/88/);
    assert.match(event.evidence, /release e smoke test real permanecem pendentes/);
});

test('portal records the stale installed Nebula runtime without claiming the bind cause or download success', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-live-runtime-stale-2026-10-18-0912');

    assert.ok(event, 'portal should publish the local runtime/source comparison');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /HTTP 200 e executável confirmado em 12\.1\.21/);
    assert.match(event.evidence, /não se presume processo órfão/);
    assert.match(event.evidence, /Instalação\/restart e smoke test controlados continuam pendentes/);
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

    const dashboard = createDashboard({ ...statusData, events: [event] });
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

    const dashboard = createDashboard({ ...statusData, events: [event] });
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

    const dashboard = createDashboard({ ...statusData, events: [event] });
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
    assert.equal(statusData.coverage.completed, 331);
    assert.equal(statusData.coverage.pending, 66);
    assert.equal(statusData.coverage.total, 401);
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
    assert.match(server.testAudit.label, /NebulaPython 3\.10 isolado: 685\/685/);
    assert.match(server.testAudit.label, /Auditoria automatizada não equivale à homologação formal; release mais recente registrada: v12\.1\.35/);
    assert.equal(statusData.coverage.pending, 66);
    assert.equal(statusData.coverage.inProgress, 4);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula download audit distinguishes historical streaming/FTP failure from current local test evidence', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-log-and-release-test-gate-2026-10-18-0841');
    const mongoAudit = statusData.events.find(item => item.id === 'server-mongo-isolated-nebula-frontend-audit-2026-10-19-1952');
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
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.match(server.testAudit.label, /NebulaPython 3\.10 isolado: 685\/685/);
    assert.ok(mongoAudit);
    assert.match(mongoAudit.evidence, /MongoDB 7\.0 do CI/);
    assert.equal(statusData.coverage.pending, 66);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records broad server validation without claiming a production download or release', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-full-suite-validation-2026-10-18-0933');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /FullyQualifiedName!~Integration, terminou com exit code 0/);
    assert.match(event.evidence, /1\.494 aprovados, 63 ignorados/);
    assert.match(event.evidence, /falha não determinística no teste ao vivo NartoDrama/);
    assert.match(event.evidence, /passou 1\/1 isoladamente/);
    assert.match(event.evidence, /Nenhuma instalação, reinicialização, configuração ou transferência produtiva/);
    assert.equal(server.status, 'in_progress');
    assert.equal(statusData.coverage.pending, 66);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula log separates the intentional streaming-only mount from transfer mode', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-stream-only-runtime-log-2026-10-18-0935');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /Modo Somente Streaming/);
    assert.match(event.evidence, /workers de upload desativados/);
    assert.match(event.evidence, /start\/readiness\/scan do Downloader STRM/);
    assert.match(event.evidence, /WinError 10048/);
    assert.match(event.evidence, /repetidamente que outra montagem de N: já está ativa/);
    assert.match(event.evidence, /não identifica o processo dono/);
    assert.match(event.evidence, /Cleanup está configurado/);
    assert.match(event.evidence, /não há resultado de varredura\/remoção no log/);
    assert.match(event.evidence, /backup automático aguarda uploads Telegram ativos/);
    assert.match(event.evidence, /versão instalada observada anteriormente \(12\.1\.21\) diverge da fonte local/);
    assert.match(event.evidence, /O log é histórico/);
    assert.match(event.evidence, /Nenhum comando foi enviado à produção/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    assert.equal(statusData.tracks.find(track => track.id === 'server').status, 'in_progress');
});

test('Nebula follow-up log records the unavailable API and preserves the live Python worker', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-download-log-followup-2026-10-18-1033');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /GET \/System\/Info\/Public recusou conexão em 127\.0\.0\.1:8096/);
    assert.match(event.evidence, /Python PID 6080 mantém 2121 e 2123 em LISTEN/);
    assert.match(event.evidence, /não foi encerrado/);
    assert.match(event.evidence, /54\/54 aprovados/);
    assert.match(event.evidence, /pytest ausente/);
    assert.match(event.evidence, /nenhum restart ou transferência foi feito/);
    assert.equal(statusData.coverage.pending, 66);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('server roadmap coverage includes the 18 October baseline resample and current Nebula incident evidence', () => {
    const resample = statusData.features.find(item => item.id === 'T0.1.4');
    const remainingBaseline = statusData.features.find(item => item.id === 'T0.1.5');
    const incident = statusData.events.find(item => item.id === 'server-nebula-download-orphan-stream-worker-audit-2026-10-18-1016');

    assert.equal(resample.status, 'completed');
    assert.match(resample.name, /Reamostragem read-only em 18\/10\/2026/);
    assert.equal(remainingBaseline.status, 'pending');
    assert.ok(incident);
    assert.equal(incident.status, 'in_progress');
    assert.deepEqual(incident.featureIds, ['T2.1']);
    assert.match(incident.evidence, /worker órfão/);
    assert.match(incident.evidence, /não contém marcador STRM/);
    assert.match(incident.evidence, /Nenhuma ação de parada foi feita/);
    assert.equal(statusData.coverage.completed, 331);
    assert.equal(statusData.coverage.pending, 66);
    assert.equal(statusData.coverage.total, 401);
    assert.equal(statusData.coverage.completed + statusData.coverage.pending + statusData.coverage.inProgress, statusData.coverage.total);
});

test('server baseline publishes short live samples without claiming T0.1 complete', () => {
    const event = statusData.events.find(item => item.id === 'server-production-baseline-resample-2026-10-18-0942');
    const feature = statusData.features.find(item => item.id === 'T0.1');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T0.1']);
    assert.match(event.evidence, /Duas baterias de 15 GETs/);
    assert.match(event.evidence, /p95 nearest-rank\/max 785,36 ms/);
    assert.match(event.evidence, /excedeu timeout de 5 s/);
    assert.match(event.evidence, /Baselines? T0\.1 segue parcial/);
    assert.equal(feature.status, 'in_progress');
    assert.equal(statusData.coverage.pending, 66);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula cleanup documents an immediate background first pass and periodic follow-up', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-cleanup-first-pass-2026-10-18-0954');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.6']);
    assert.match(event.evidence, /primeira passagem imediatamente/);
    assert.match(event.evidence, /PeriodicTimer de 15 minutos/);
    assert.match(event.evidence, /sem sobrepor trabalho/);
    assert.match(event.evidence, /loop\/refresh\/checkpoint\/lifecycle 33\/33/);
    assert.match(event.evidence, /Não houve instalação\/restart em produção/);
    assert.equal(statusData.features.find(item => item.id === 'T2.6').status, 'completed');
    assert.equal(statusData.coverage.pending, 66);
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

test('Nebula log validation distinguishes source tests from production download homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-log-validation-2026-10-18-1044');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /592\/592/);
    assert.match(event.evidence, /47\/47/);
    assert.match(event.evidence, /1\.496 aprovados, 63 ignorados, 0 falhas/);
    assert.match(event.evidence, /não comprova falha da ação separada de download/);
    assert.match(event.evidence, /não houve transferência real/);
    assert.match(event.evidence, /release permanecem abertas/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula startup rollback preserves a pre-existing Supabase sync and stays in progress', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-supabase-service-retained-on-start-failure-2026-10-18-1051');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1', 'T4.2']);
    assert.match(event.evidence, /57\/57/);
    assert.match(event.evidence, /suíte completa Jellyfin\.Server\.Implementations\.Tests Release passou com 1\.496 aprovados, 63 ignorados e 0 falhas/);
    assert.match(event.evidence, /Sem prova de transição real ou download/);
    assert.match(event.evidence, /release permanecem abertos/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula package gate requires downloader Mongo readiness without claiming production download', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-downloader-package-readiness-contract-2026-10-18-1114');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1']);
    assert.match(event.evidence, /sem \[STRM-WORKER-MONGO-READY\]/);
    assert.match(event.evidence, /causa provável/);
    assert.match(event.evidence, /47\/47/);
    assert.match(event.evidence, /sem instalação, restart, scan ou transferência real/);
    assert.match(event.evidence, /smoke test do botão/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('broad server validation reports local suite results without closing production gates', () => {
    const event = statusData.events.find(item => item.id === 'server-broad-validation-2026-10-18-1126');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1', 'T4.2']);
    assert.match(event.evidence, /1\.498 aprovados, 63 ignorados, 0 falhas/);
    assert.match(event.evidence, /Jellyfin\.Api\.Tests 730\/730/);
    assert.match(event.evidence, /Jellyfin\.Providers\.Tests 790\/790/);
    assert.match(event.evidence, /NebulaPython 592\/592/);
    assert.match(event.evidence, /Mongo descartável em 127\.0\.0\.1:27099 indisponível/);
    assert.match(event.evidence, /release do servidor permanecem em andamento/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('latest .NET solution regression publishes exact counts without claiming integration or production validation', () => {
    const event = statusData.events.find(item => item.id === 'server-dotnet-solution-regression-2026-10-19-1233');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /4\.971 aprovados, 63 ignorados, 0 falhas/);
    assert.match(event.evidence, /filtro exclui casos com Integration/);
    assert.match(event.evidence, /Portal Node 120\/120/);
    assert.match(event.evidence, /CI remoto, integrações reais.*Release permanecem pendentes/);
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('cross-stack server validation records full MariaDB-backed HTTP integration results without claiming production acceptance or release', () => {
    const event = statusData.events.find(item => item.id === 'server-cross-stack-validation-2026-10-19-1239');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /NebulaPython passou 598\/598/);
    assert.match(event.evidence, /passou 418 testes em 75 arquivos/);
    assert.match(event.evidence, /1\.927 arquivos/);
    assert.match(event.evidence, /Portal Node: 122\/122/);
    assert.match(event.evidence, /UpdateInfoController consulta a coleção pública de Releases do GitHub e só aceita pacote \.zip/);
    assert.match(event.evidence, /API confirma latest v12\.1\.21 e tag v12\.1\.24 retorna HTTP 404/);
    assert.match(event.evidence, /branch\/tag não aciona o atualizador/);
    assert.match(event.evidence, /Category=RequiresMongo` passou 24\/24.*127\.0\.0\.1:27099/);
    assert.match(event.evidence, /IntroSkipper\.Integration\.Tests` MariaDB passou 39\/39.*127\.0\.0\.1:33099/);
    assert.match(event.evidence, /UserManager\.GetFirstUser\(\).*39\/39 passaram/);
    assert.match(event.evidence, /GetDashboardConfigurationPage_GetAvatar_HasDashboardPageWrapper` passou 1\/1.*MariaDB descartável/);
    assert.match(event.evidence, /host\/usuário\/senha herdados deliberadamente inválidos/);
    assert.match(event.evidence, /MulletaFlixApplicationFactory` agora aplica e restaura host, porta, schema, usuário e senha/);
    assert.match(event.evidence, /Build focal Release: 0 avisos\/0 erros/);
    assert.match(event.evidence, /Mongo 27017 e MariaDB 3306 não foram acessadas/);
    assert.match(event.evidence, /Jellyfin\.Server\.Integration\.Tests` completa passou 140\/143: 140 aprovados, 3 ignorados.*0 falhas.*MariaDB 11\.4\.4 descartável em loopback 127\.0\.0\.1:33099/);
    assert.match(event.evidence, /runner encerrou o processo e a porta foi confirmada fechada/);
    assert.match(event.evidence, /diretórios scratch temporários desta execução foram deixados no TEMP local/);
    assert.match(event.evidence, /CI remoto, integração Server end-to-end, runtime e smoke test permanecem pendentes; Release permanece pendente até cumprir esses gates/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('UserLibrary positive HTTP integration tests are enabled and the full suite has no skips', () => {
    const event = statusData.events.find(item => item.id === 'server-user-library-positive-integration-tests-2026-10-19-1414');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.local, /UserLibraryControllerTests 16\/16/);
    assert.match(event.local, /Jellyfin\.Server\.Integration\.Tests 144\/144, 0 skips e 0 falhas/);
    assert.match(event.evidence, /MariaDB 11\.4\.4 descartável em 127\.0\.0\.1:33099/);
    assert.match(event.evidence, /MariaDB produtivo 3306 permaneceu ativo, não consultado nem alterado/);
    assert.match(event.evidence, /limpeza recursiva/);
    assert.match(event.evidence, /runtime instalado, smoke produtivo e publicação de Release continuam pendentes/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('latest .NET solution regression records filtered TRX totals and explicit Nebula prefetch tasks', () => {
    const event = statusData.events.find(item => item.id === 'server-dotnet-regression-prefetch-cs4014-2026-10-19-1439');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.local, /5\.044 aprovados, 64 ignorados, 0 falhas/);
    assert.match(event.local, /NebulaPlaybackCacheTests 59\/59/);
    assert.match(event.local, /Implementations \(rerun final\): 1\.506 aprovados, 63 ignorados, 0 falhas \(1\.569 total\)/);
    assert.match(event.evidence, /TRX por projeto totalizando 5\.044 aprovados, 64 ignorados e 0 falhas em 5\.108/);
    assert.match(event.evidence, /não tiveram testes correspondentes ao filtro/);
    assert.match(event.evidence, /-warnaserror:CS4014/);
    assert.match(event.evidence, /oito chamadas intencionais a `StartPrefetch`/);
    assert.match(event.evidence, /390 avisos de analisador\/estilo\/documentação XML não relacionados/);
    assert.match(event.evidence, /Nenhum serviço, banco ou mídia de produção foi acessado/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Mongo CI reconciliation separates local 8.3 coverage from pending CI 7.0 and release', () => {
    const event = statusData.events.find(item => item.id === 'server-mongo-test-ci-and-release-gate-reconciliation-2026-10-19-1453');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.local, /RequiresMongo: 24\/24 em MongoDB 8\.3\.7 descartável/);
    assert.match(event.local, /contrato de cobertura do CI: 1\/1/);
    assert.match(event.evidence, /não valida Mongo 7\.0/);
    assert.match(event.evidence, /runner_id=0 e zero steps/);
    assert.match(event.evidence, /v12\.1\.21/);
    assert.match(event.evidence, /v12\.1\.24 responde 404/);
    assert.match(event.evidence, /Homologação permanece in_progress/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('server regression skipped-test audit distinguishes database setup from platform skips', () => {
    const event = statusData.events.find(item => item.id === 'server-dotnet-skipped-tests-audit-2026-10-19-1457');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.local, /30 MySQL\/MariaDB isolado; 24 Mongo opt-in/);
    assert.match(event.evidence, /passado separadamente 24\/24 em Mongo 8\.3\.7/);
    assert.match(event.evidence, /não em Mongo 7\.0/);
    assert.match(event.evidence, /33099 não tem listener/);
    assert.match(event.evidence, /A porta 3306 ficou intocada/);
    assert.match(event.evidence, /não cobre os 30 casos da assembly Implementations/);
    assert.match(event.evidence, /homologação fica in_progress/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula startup log separates successful initial backup from stale auto-sync and mount evidence', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-startup-log-analysis-2026-10-18-1129');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.deepEqual(event.featureIds, ['T2.1', 'T4.2']);
    assert.match(event.evidence, /backup inicial concluído em 13,5 s/);
    assert.match(event.evidence, /248 adiamentos/);
    assert.match(event.evidence, /duas colisões WinError 10048/);
    assert.match(event.evidence, /14 tentativas de mount/);
    assert.match(event.evidence, /Não aparece StartDownloader/);
    assert.match(event.evidence, /Homologação e release continuam em andamento/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('Nebula downloader audit records duplicate log, focused tests, and production blocker', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-downloader-readiness-audit-2026-10-18-1200');
    const server = statusData.tracks.find(item => item.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.updatedAt, '2026-10-18T13:42:00-03:00');
    assert.match(event.evidence, /54\.444 bytes, 516 linhas/);
    assert.match(event.evidence, /Implementations Release 1\.499 aprovados\/63 ignorados\/0 falhas/);
    assert.match(event.evidence, /Python 595\/595/);
    assert.match(event.evidence, /MulletaFlixServer continua ausente/);
    assert.match(event.evidence, /product version 12\.1\.21/);
    assert.match(event.evidence, /PID Python 6080 mantém listeners 2121 e 2123/);
    assert.match(event.evidence, /heartbeat TCP local autenticado/);
    assert.match(event.evidence, /Implementations Release 1\.499 aprovados\/63 ignorados/);
    assert.match(event.evidence, /NebulaPython 595\/595/);
    assert.match(event.evidence, /Test-CleanInstaller\.ps1/);
    assert.match(event.evidence, /GitHub CLI sem autenticação/);
    assert.match(event.evidence, /NebulaPlaybackCacheTests Release 59\/59/);
    assert.match(event.evidence, /test_main_lifecycle\.py 12\/12/);
    assert.match(event.evidence, /NebulaPython 598\/598/);
    assert.match(event.evidence, /fallback stream_service\.py sem heartbeat/);
    assert.match(event.evidence, /37 conexões TCP estabelecidas/);
    assert.match(event.evidence, /não deve ser classificado como inativo/);
    assert.match(event.evidence, /Revisão independente via cavecrew indisponível/);
    assert.match(event.evidence, /Release, instalação candidata/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal keeps MariaDB username collation in progress until case-sensitive Linux validation', async () => {
    const dashboard = createDashboard();
    await settleDashboard();

    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-username-binary-collation-2026-10-19');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    assert.match(event.evidence, /utf8mb4_bin/);
    assert.match(event.evidence, /tabela canônica `Users`/);
    assert.match(event.evidence, /BINARY TABLE_NAME = BINARY 'Users'/);
    assert.match(event.evidence, /EnsureSchemaCreated_UsesEfMappedUsersTableWithBinaryUsernameCollations/);
    assert.match(event.evidence, /job user-mariadb-linux-tests em Ubuntu\/MariaDB 11\.4/);
    assert.match(event.evidence, /31 casos ficaram NotExecuted sem a variável de conexão/);
    assert.match(event.evidence, /teste SQL ainda não foi executado em Actions/);
    assert.match(event.evidence, /5\.044 aprovados, 65 NotExecuted, 0 falhas em 5\.109/);
    assert.match(event.evidence, /Runtime\/produção, CI remoto e Release não foram validados/);
    assert.match(event.evidence, /Runtime\/produção, CI remoto e Release não foram validados/);
    assert.equal(server.status, 'in_progress');
    assert.match(dashboard.getElement('event-list').innerHTML, /Servidor: usernames distintos respeitam acentos no MariaDB/);
});

test('portal reports Windows packaging CI as locally verified but remotely pending', () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-windows-packaging-ci-tests-2026-10-19-1624');

    assert.ok(event);
    assert.equal(server.status, 'in_progress');
    assert.equal(event.status, 'in_progress');
    assert.match(event.scope, /ainda está somente no checkout local e não foi enviada ao Git do servidor/);
    assert.match(server.testAudit.label, /5\.120.*5\.356/);
    assert.match(event.evidence, /node --test dos contratos Mongo, MariaDB e empacotamento passou 3\/3/);
    assert.match(event.evidence, /passaram 4\/4 em PowerShell local/);
    assert.match(event.evidence, /runner Windows remoto ainda não executou/);
    assert.match(event.evidence, /v12\.1\.24 não tem objeto Release \(404\)/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal distinguishes Live TV capability TestServer evidence from production playback', () => {
    const event = statusData.events.find(item => item.id === 'server-live-tv-capability-http-validation-2026-10-19-1631');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /Reexecução focal Release: 10\/10 aprovados/);
    assert.match(event.evidence, /TestServer transmite bytes para capability ativa/);
    assert.match(event.evidence, /Cache-Control no-store/);
    assert.match(event.evidence, /rejeita timer IDs\/capabilities malformadas ou inativas com 404/);
    assert.match(event.evidence, /geração de capability pelo gravador real, transcoding\/playback e instalação continuam pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal publishes deterministic Live TV capability fuzz evidence and remaining gates', () => {
    const event = statusData.events.find(item => item.id === 'server-live-tv-capability-fuzz-2026-10-19-1636');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /suíte focal Release passou 10\/10/);
    assert.match(event.evidence, /256 tokens URL-safe não emitidos/);
    assert.match(event.evidence, /todos retornaram HTTP 404/);
    assert.match(event.evidence, /gravador real, transcoding\/playback, instalação ou produção; esses gates seguem pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('homologation timeline renders deterministic Live TV capability fuzz event', async () => {
    const dashboard = createDashboard();
    await settleDashboard();

    assert.match(dashboard.getElement('event-list').innerHTML, /Live TV: fuzz HTTP determinístico rejeita 256 capabilities não emitidas/);
});

test('portal publishes the Live TV capability producer contract without claiming real playback', () => {
    const event = statusData.events.find(item => item.id === 'server-live-tv-capability-producer-2026-10-19-1647');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /Teste direto do produtor 1\/1/);
    assert.match(event.evidence, /classe MediaSourceManagerTests 31\/31/);
    assert.match(event.evidence, /ActiveRecordingStreamPathResolverTests 6\/6/);
    assert.match(event.evidence, /seleção HTTP focal 17\/17 cobrindo LiveRecordingStreamCapabilityHttpTests, RequestPathLogRedactorTests e filtros de middleware/);
    assert.match(event.evidence, /comando\/filtro exato e um TRX dessa seleção não foram preservados/);
    assert.match(event.evidence, /54 casos únicos/);
    assert.match(event.evidence, /não contém timer ID/);
    assert.match(event.evidence, /Gravação real, transcoding\/playback, pacote instalado e produção continuam pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('homologation timeline renders the Live TV capability producer event', async () => {
    const dashboard = createDashboard();
    await settleDashboard();

    assert.match(dashboard.getElement('event-list').innerHTML, /Live TV: produtor usa capability da gravação no EncoderPath/);
    assert.ok(statusData.events.findIndex(item => item.id === 'server-live-tv-capability-producer-2026-10-19-1647')
        < statusData.events.findIndex(item => item.id === 'server-live-tv-capability-fuzz-2026-10-19-1636'));
});

test('portal publishes the Nebula first-STRM integration test and its real-service gates', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-first-strm-end-to-end-test-2026-10-19-1701');
    const dashboard = createDashboard();
    await settleDashboard();

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /test_strm_downloader\.py: 18\/18/);
    assert.match(event.evidence, /A suíte Nebula Python 3\.10 completa com cobertura passou 616 testes em 133\.52s, zero falhas\/ignorados/);
    assert.match(event.evidence, /cobertura global 90% \(14\.256 statements, 1\.359 misses\)/);
    assert.match(event.evidence, /tools\/strm_downloader\.py 80%, tools\/feed_ftp\.py 76%, main\.py 75%, ftp\/pathio\.py 82%/);
    assert.match(event.evidence, /test_feed_ftp_strm\.py: 65\/65/);
    assert.match(event.evidence, /test_mongo_admission\.py: 6\/6/);
    assert.match(event.evidence, /tools\/mongo_admission\.py 100% \(73\/73 statements\)/);
    assert.match(event.evidence, /ObjectId, fallback de _id string, entrada inválida e ausência/);
    assert.match(event.evidence, /worker-ready, índice pronto, mongo-ready, scan, dedupe, download, queue registration/);
    assert.match(event.evidence, /Não comprova Mongo\/HTTP reais, throughput, instalação ou produção/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    assert.match(dashboard.getElement('event-list').innerHTML, /Nebula: teste do worker pronto até o primeiro STRM enfileirado/);
    assert.ok(statusData.events.findIndex(item => item.id === 'server-dotnet-broad-suite-mongo-gate-2026-10-19-1900')
        < statusData.events.findIndex(item => item.id === 'server-nebula-mongo-integration-tests-2026-10-19-1840'));
});

test('portal reports full Nebula completed-destination fallback coverage with Mongo limits', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-completed-destination-fallback-tests-2026-10-19-1746');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /test_feed_ftp_strm\.py passou 73\/73/);
    assert.match(event.evidence, /suíte NebulaPython passou 624\/624 em 127,25 s/);
    assert.match(event.evidence, /91% \(14\.281 statements, 1\.330 ausentes\)/);
    assert.match(event.evidence, /tools\/feed_ftp\.py 78%/);
    assert.match(event.evidence, /MongoClient é simulado/);
    assert.match(event.evidence, /sem pacote ou Release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal publishes completed-destination fallback edge coverage without claiming Mongo production validation', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-completed-destination-fallback-edge-tests-2026-10-19-1755');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /teste focal passou 82\/82/);
    assert.match(event.evidence, /suíte completa NebulaPython passou 633\/633 em 131,51 s/);
    assert.match(event.evidence, /tools\/feed_ftp\.py passou de 78% para 79%/);
    assert.match(event.evidence, /14\.334 statements, 1\.318 ausentes/);
    assert.match(event.evidence, /MongoClient é simulado/);
    assert.match(event.evidence, /Somente testes foram alterados, sem pacote\/Release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal publishes branch-coverage evidence with its fixture and production limitations', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-completed-destination-branch-coverage-2026-10-19-1800');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /test_feed_ftp_strm\.py passou 85\/85 com --cov-branch/);
    assert.match(event.evidence, /suíte completa passou 636\/636 em 133,42 s/);
    assert.match(event.evidence, /14\.357 statements, 1\.318 ausentes; 2\.744 branches, 497 parciais/);
    assert.match(event.evidence, /492 branches, 101 parciais/);
    assert.match(event.evidence, /MongoClient segue simulado/);
    assert.match(event.evidence, /sem pacote ou Release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal publishes the 24 real Mongo integration passes without equating Mongo 8.3.7 to CI 7.0', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-mongo-integration-tests-2026-10-19-1840');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /24\/24 aprovados, 0 falhas/);
    assert.match(event.evidence, /MongoDB 8\.3\.7 temporário/);
    assert.match(event.evidence, /Não equivale ao MongoDB 7\.0 do CI/);
    assert.match(event.evidence, /Mongo em 27017 não foi acessado/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
    assert.ok(statusData.events.findIndex(item => item.id === event.id)
        < statusData.events.findIndex(item => item.id === 'server-nebula-first-strm-end-to-end-test-2026-10-19-1701'));
});

test('portal puts the latest broad .NET regression and unresolved release gates first', async () => {
    const event = statusData.events.find(item => item.id === 'server-full-regression-safe-scope-2026-10-22-1741');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.equal(event.id, 'server-full-regression-safe-scope-2026-10-22-1741');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.match(event.evidence, /FullyQualifiedName!~Integration/);
    assert.match(event.evidence, /5\.158 Passed, 69 NotExecuted, 0 Failed/);
    assert.match(event.evidence, /Homologação formal do servidor permanece 1\/7/);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /regressão \.NET Release e Nebula Python revalidados/);
});

test('portal publishes the latest full Nebula Python branch-coverage rerun', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-python-full-suite-2026-10-19-1908');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.equal(event.id, 'server-nebula-python-full-suite-2026-10-19-1908');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /passou 646\/646 em 98,15 s/);
    assert.match(event.evidence, /88% \(14\.440 statements, 1\.285 misses; 2\.744 branches, 497 parciais\)/);
    assert.match(event.evidence, /não representa isoladamente cobertura de produção/);
    assert.match(event.evidence, /não comprovam transferência Telegram, Mongo externo, runtime instalado/);
    assert.match(server.testAudit.label, /NebulaPython 3\.10 isolado: 685\/685/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal distinguishes GitHub Actions runner allocation failures from test failures', () => {
    const event = statusData.events.find(item => item.id === 'server-github-actions-runner-allocation-blocked-2026-10-19-1912');
    const pythonEvent = statusData.events.find(item => item.id === 'server-nebula-python-full-suite-2026-10-19-1908');
    const dashboard = createDashboard();

    assert.equal(event.id, 'server-github-actions-runner-allocation-blocked-2026-10-19-1912');
    assert.equal(event.status, 'blocked');
    assert.match(event.evidence, /runner_id=0 e zero steps/);
    assert.match(event.evidence, /11 jobs também falharam antes de qualquer step/);
    assert.match(event.evidence, /não executaram build\/testes/);
    assert.match(event.evidence, /account is locked due to a billing issue/);
    assert.match(event.evidence, /anotação do primeiro job reporta o mesmo bloqueio de faturamento/);
    assert.match(event.evidence, /continua v12\.1\.21/);
    assert.ok(statusData.events.findIndex(item => item.id === event.id)
        < statusData.events.findIndex(item => item.id === pythonEvent.id));
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    return settleDashboard().then(() => {
    assert.match(dashboard.getElement('event-list').innerHTML, /CI e release: GitHub não alocou runners; nenhum step executado/);
    });
});

test('portal shows GetAvatar concurrency fix with cross-API and runtime limits', async () => {
    const event = statusData.events.find(item => item.id === 'server-getavatar-profile-mutation-serialization-2026-10-19-2013');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /falhou antes da correção/);
    assert.match(event.evidence, /AvatarControllerUserAvatarAuthorizationTests passou 23\/23 Release/);
    assert.match(event.evidence, /Jellyfin.Api.Tests passou 741\/741/);
    assert.match(event.evidence, /ImageController\.cs não usam o semáforo/);
    assert.match(event.evidence, /EF\/MariaDB, runtime instalado, produção e GitHub Release não foram validados/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /GetAvatar: serialização de seleção, remoção e reparo de perfil/);
    assert.ok(dashboard.getElement('event-list').innerHTML.indexOf('GetAvatar: serialização de seleção') < dashboard.getElement('event-list').innerHTML.indexOf('Servidor: projetos de integração executados'));
});

test('portal publishes the shared per-user profile image lock across GetAvatar and native API', async () => {
    const event = statusData.events.find(item => item.id === 'server-profile-image-shared-lock-2026-10-19-2026');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.match(event.scope, /lock por usuário compartilhado/);
    assert.match(event.evidence, /API focal: 40\/40/);
    assert.match(event.evidence, /Jellyfin\.Api\.Tests: 742\/742/);
    assert.match(event.evidence, /Jellyfin\.Server\.Implementations\.Tests: 1\.508 aprovados, 64 ignorados, 0 falhas/);
    assert.match(event.evidence, /sem HTTP concorrente integrado, MariaDB, runtime instalado, produção ou GitHub Release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    const timeline = dashboard.getElement('event-list').innerHTML;
    assert.match(timeline, /GetAvatar e API nativa: lock compartilhado de perfil por usuário/);
    assert.ok(timeline.indexOf('lock compartilhado de perfil por usuário') < timeline.indexOf('GetAvatar: serialização de seleção'));
});

test('native profile image upload durability evidence is published with integration limits', async () => {
    const event = statusData.events.find(item => item.id === 'server-native-profile-image-preserve-on-upload-failure-2026-10-19-2042');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /Regressão RED reproduzida/);
    assert.match(event.evidence, /Três testes focais Release passaram/);
    assert.match(event.evidence, /Jellyfin\.Api\.Tests completa: 744\/744/);
    assert.match(event.evidence, /sem HTTP integrado, EF relacional\/MariaDB/);
    assert.match(event.evidence, /compatibilidade de clientes ainda precisa ser verificada/);
    assert.match(event.evidence, /Nenhuma release do servidor criada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Upload nativo de perfil preserva a imagem anterior em falhas/);
});

test('external profile snapshot rollback fix publishes RED/GREEN API evidence and remaining limits', async () => {
    const event = statusData.events.find(item => item.id === 'server-getavatar-external-profile-rollback-2026-10-19-2142');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /RED observado/);
    assert.match(event.evidence, /28\/28/);
    assert.match(event.evidence, /Jellyfin\.Api\.Tests Release passou 753\/753/);
    assert.match(event.evidence, /TOCTOU .* permanece pendente/);
    assert.match(event.evidence, /não validam MariaDB\/HTTP integrado, runtime instalado ou produção/);
    assert.match(event.evidence, /Nenhuma release foi criada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /GetAvatar: rollback não regrava arquivo de perfil externo/);
});

test('profile-image handle research stays in progress and does not claim TOCTOU closure', async () => {
    const event = statusData.events.find(item => item.id === 'server-profile-image-delete-handle-design-2026-10-19-2151');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /não prova proteção dos ancestrais contra rename concorrente/);
    assert.match(event.evidence, /TOCTOU continua aberto/);
    assert.match(event.evidence, /testes de rename\/junction\/symlink concorrente em Windows e Linux/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Fotos de perfil: pesquisa confirma primitivas, mas TOCTOU segue aberto/);
});

test('profile directory permission audit distinguishes package policy from production evidence', async () => {
    const event = statusData.events.find(item => item.id === 'server-profile-directory-permissions-audit-2026-10-19-2156');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /Directory.CreateDirectory sem ACL\/modo explícitos/);
    assert.match(event.evidence, /Debian aplica jellyfin:adm\/0750 condicional/);
    assert.match(event.evidence, /não ACL efetiva de produção/);
    assert.match(event.evidence, /Release passaram 6\/6/);
    assert.match(event.evidence, /não cobrem ACL ou rename concorrente/);
    assert.match(event.evidence, /TOCTOU continua aberto/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Fotos de perfil: diretórios dependem de ACL herdada, produção ainda não verificada/);
});

test('live profile ACL audit distinguishes active runtime from a separate writable data tree', async () => {
    const event = statusData.events.find(item => item.id === 'server-live-profile-acl-audit-2026-10-19-2202');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /MulletaFlix 12\.1\.21 ativo roda interativamente/);
    assert.match(event.evidence, /29 pastas de perfil/);
    assert.match(event.evidence, /não há escrita para BUILTIN Users\/Everyone/);
    assert.match(event.evidence, /Capability SID não resolvido/);
    assert.match(event.evidence, /Outra árvore sob ProgramData tem Users:Write, mas não corresponde ao datadir/);
    assert.match(event.evidence, /não fecha TOCTOU/);
    assert.match(event.evidence, /Testes focais Release: 6\/6/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Fotos de perfil: runtime 12\.1\.21 sem escrita geral, capability SID e árvore paralela pendentes/);
});

test('Windows installer data ACL hardening is reported without claiming installation or production validation', async () => {
    const event = statusData.events.find(item => item.id === 'server-installer-service-data-acl-2026-10-19-2219');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /limita icacls à raiz de dados \(sem \/T\)/);
    assert.match(event.evidence, /BUILTIN Users, Everyone e Authenticated Users/);
    assert.match(event.evidence, /build NSIS Release local compilou com sucesso/);
    assert.match(event.evidence, /O smoke de instalação limpa não foi executado/);
    assert.match(event.evidence, /ACL efetiva em descendentes com ACL protegida/);
    assert.match(event.evidence, /sessão atual não tem token administrativo/);
    assert.match(event.evidence, /Nenhuma release foi criada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Instalador Windows restringe ACL ao diretório de dados escolhido/);
});

test('server suite revalidation records the full solution gate and keeps global homologation open', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-main-suite-revalidation-2026-10-19-2246');

    assert.ok(event);
    assert.equal(server.status, 'in_progress');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /dotnet test MulletaFlix\.sln.*5\.060 aprovados, 65 ignorados, 0 falhas \(5\.125\)/);
    assert.match(event.evidence, /Implementations\.Tests 1\.508 aprovados\/64 ignorados/);
    assert.match(event.evidence, /Providers 793 no gate filtrado/);
    assert.match(event.evidence, /NebulaPython Python 3\.10 separado 646\/646/);
    assert.match(event.evidence, /zero testes selecionados/);
    assert.match(event.evidence, /Nenhuma release criada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Revalidação local das suítes principais do servidor/);
});

test('GetAvatar handle-relative design research publishes cross-platform constraints without claiming a fix', async () => {
    const event = statusData.events.find(item => item.id === 'server-avatar-handle-relative-strategy-2026-10-20-0012');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /NtCreateFile relativo ao RootDirectory do handle pai e OBJ_DONT_REPARSE/);
    assert.match(event.evidence, /openat2 com RESOLVE_BENEATH\|RESOLVE_NO_SYMLINKS/);
    assert.match(event.evidence, /validar flags XNU na versão mínima/);
    assert.match(event.evidence, /rename concorrente/);
    assert.match(event.evidence, /Nenhum código ou teste foi alterado\/executado nesta rodada/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /GetAvatar: estratégia multiplataforma de acesso relativo a handles definida/);
});

test('GetAvatar focused authorization suite recheck does not claim TOCTOU mitigation', async () => {
    const event = statusData.events.find(item => item.id === 'server-avatar-toctou-test-recheck-2026-10-20-0018');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /passou 32\/32, sem ignorados ou falhas/);
    assert.match(event.evidence, /não tem WSL instalado/);
    assert.match(event.evidence, /não prova fechamento de TOCTOU/);
    assert.match(event.evidence, /release e homologação formal permanecem abertas/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /GetAvatar: regressões focadas revalidadas; mitigação TOCTOU segue pendente/);
});

test('previous server-wide regression remains in history with exact cross-language results', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-broad-cross-language-regression-2026-10-20-0148');

    assert.ok(event);
    assert.equal(server.status, 'in_progress');
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /concluiu exit code 0/);
    assert.match(event.evidence, /17 TRX: 5\.070 Passed, 68 NotExecuted, 0 Failed\/5\.138/);
    assert.match(event.evidence, /dois assemblies Integration tiveram zero casos selecionados/);
    assert.match(event.evidence, /Tools\/NebulaPython passou 646\/646/);
    assert.match(event.evidence, /Contratos Node de release passaram 19\/19/);
    assert.match(event.evidence, /Não foram executados MariaDB\/Mongo reais/);
    assert.match(event.evidence, /Homologação formal e release seguem pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Servidor: regressão ampla concluída; homologação integrada pendente/);
});

test('latest integration-inclusive server regression publishes exact pass and skip breakdown', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-integration-inclusive-regression-2026-10-20-0203');

    assert.ok(event);
    assert.equal(server.status, 'in_progress');
    assert.deepEqual(server.testAudit, {
        passed: 5241,
        total: 5494,
        skipped: 253,
        failed: 0,
        percent: 95.4,
        label: server.testAudit.label,
    });
    assert.equal(event.status, 'in_progress');
    assert.match(server.testAudit.label, /Homologação formal permanece 2\/7/);
    assert.match(event.evidence, /17 TRX.*5\.099 Passed, 235 NotExecuted, 0 Failed\/5\.334/);
    assert.match(event.evidence, /código final de saída do processo não foi recuperado/);
    assert.match(event.evidence, /Server Integration: 3 aprovados\/142 ignorados; IntroSkipper Integration: 14\/25/);
    assert.match(event.evidence, /198 skips pedem MariaDB descartável.*24 pedem MongoDB descartável/);
    assert.match(event.evidence, /DramaFindsLiveIntegrationTests foi excluída para evitar API externa/);
    assert.match(event.evidence, /nenhum banco real foi acessado/);
    assert.match(event.evidence, /Homologação integrada segue aberta/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Servidor: testes inclusivos executados; bancos opt-in seguem pendentes/);
});

test('isolated Mongo opt-in revalidation is published without claiming CI or production validation', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-mongo-optin-revalidation-2026-10-20-0219');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /exit code 0: 24 aprovados, 0 NotExecuted, 0 falhas/);
    assert.match(event.evidence, /MongoDB 8\.3\.7.*127\.0\.0\.1.*27099/);
    assert.match(event.evidence, /serviço padrão.*27017 não foi tocado/);
    assert.match(event.evidence, /Não valida MongoDB 7\.0 do CI/);
    assert.match(event.evidence, /execução ampla anterior continua com snapshot próprio 5\.099\/5\.334 e exit code desconhecido/);
    assert.match(event.evidence, /remoção do diretório temporário.*permanece/);
    assert.match(server.testAudit.label, /NebulaPython 3\.10 isolado: 685\/685/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Mongo opt-in: 24\/24 passaram em instância descartável/);
});

test('current server regression publishes exact local counts and unresolved remote CI state', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-audit-regression-ci-status-2026-10-20-0637');

    assert.ok(event);
    assert.equal(server.status, 'in_progress');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /17 TRX por `UnitTestResult`: 5\.070 Passed, 68 NotExecuted, 0 Failed\/5\.138/);
    assert.match(event.evidence, /31 MariaDB opt-in, 24 MongoDB opt-in, 10 plataforma\/filesystem, 2 benchmarks e 1 pré-condição local/);
    assert.match(event.evidence, /NebulaPython 646\/646 e contratos Node de release 19\/19/);
    assert.match(event.evidence, /run 441.*conclusão `failure`; 11 jobs aparecem sem etapas/);
    assert.match(event.evidence, /downloads dos logs retornaram `BlobNotFound`, portanto a causa não pode ser atribuída/);
    assert.match(event.evidence, /`wsl\.exe` informa que o subsistema Linux não está instalado e Docker\/Podman não estão disponíveis, impedindo validar Linux localmente/);
    assert.match(event.evidence, /Homologação global segue aberta/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Servidor: suíte local 5\.070\/5\.138; CI remota sem diagnóstico/);
});

test('isolated MariaDB revalidation reports complete HTTP coverage and Linux-only limit', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-mariadb-optin-revalidation-2026-10-20-0231');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /MariaDB 11\.4\.4.*127\.0\.0\.1.*33099/);
    assert.match(event.evidence, /instância de produção permaneceu no PID 20736\/porta 3306, sem conexão dos testes/);
    assert.match(event.evidence, /`UserManagerNormalizedUsernameTests\|BillingDatabaseTests` passou 30\/31, com um único skip que exige `@@lower_case_table_names=0` e filesystem Linux case-sensitive/);
    assert.match(event.evidence, /Inventário `dotnet test --list-tests` confirmou 145 casos em `Jellyfin\.Server\.Integration\.Tests`; agregação por nome de teste nos TRX focais confirmou 145\/145 aprovados, 0 ignorados e 0 falhas/);
    assert.match(event.evidence, /tentativa integral do assembly foi cancelada após 78 aprovados em 17m03s; filtros focalizados posteriores cobriram todos os nomes restantes/);
    assert.match(event.evidence, /`IntroSkipper\.Integration\.Tests` passou 39\/39/);
    assert.match(event.evidence, /`UserManagerNormalizedUsernameTests\|BillingDatabaseTests` passou 30\/31/);
    assert.match(event.evidence, /197 dos 198 casos MariaDB opt-in identificados.*falta executar em Linux o caso de casing/);
    assert.match(event.evidence, /snapshot amplo \.NET permanece 5\.099\/5\.334, com código de saída não recuperado/);
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /MariaDB isolado: Server Integration 145\/145; teste Linux case-sensitive pendente/);
});

test('server audit rerun distinguishes local green tests from the externally blocked release gate', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-audit-rerun-release-gate-2026-10-20-0647');

    assert.ok(event);
    assert.equal(server.status, 'in_progress');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /5\.070 Passed, 68 NotExecuted, 0 Failed\/5\.138/);
    assert.match(event.evidence, /`py -3\.10 -m pytest tests -q` passou 646\/646/);
    assert.match(event.evidence, /`node --test tools\/release\/tests\/\*\.test\.mjs` passou 19\/19/);
    assert.match(event.evidence, /Release v12\.1\.24 `39212993752`.*sem steps; build Linux e publicação skipped/);
    assert.match(event.evidence, /annotation oficial de bloqueio de faturamento/);
    assert.match(event.evidence, /Nenhum runtime, produção, banco, instalação, mídia ou release foi alterado/);
    assert.match(event.evidence, /homologação formal continua aberta/i);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Servidor: revalidação local verde; CI\/release ainda bloqueadas externamente/);
});

test('latest API revalidation publishes GetAvatar results without claiming Linux or release validation', () => {
    const event = statusData.events.find(item => item.id === 'server-api-avatarfilestore-rerun-2026-10-20-0942');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /AvatarFileStore.*passou 4\/4 executáveis no Windows/);
    assert.match(event.evidence, /763, com 3 ignorados e 0 falhas\/766/);
    assert.match(event.evidence, /`unlinkat` ainda tem janela/);
    assert.match(event.evidence, /runtime, instalação elevada, produção e release permanecem pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('server audit records MongoDB 7.0 opt-in results and exact skip correction', async () => {
    const event = statusData.events.find(item => item.id === 'server-audit-mongo70-skip-correction-2026-10-20-0700');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /MongoDB Community 7\.0\.45/);
    assert.match(event.evidence, /`dotnet test .*Category=RequiresMongo'` passou 24\/24/);
    assert.match(event.evidence, /31 MariaDB opt-in, 24 Mongo opt-in, 10 plataforma\/filesystem, 2 benchmarks e 1 pré-condição/);
    assert.match(event.evidence, /MongoDB está parado e o diretório temporário permanece para remoção manual/);
    assert.match(event.evidence, /sem runtime, instalação, produção ou release alterados/i);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /MongoDB 7\.0 opt-in 24\/24/);
});

test('server audit records framework assembly resolution without a false skip', async () => {
    const event = statusData.events.find(item => item.id === 'server-audit-framework-dependency-resolution-2026-10-20-0708');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /DeprecatedDependencyResolutionTests passou 3\/3, 0 skips/);
    assert.match(event.evidence, /Jellyfin\.Server\.Tests passou 74\/74, 0 skips\/falhas/);
    assert.match(event.evidence, /Linux, CI remota, instalação, playback real e homologação formal seguem pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /resolução do shared framework sem falso skip/);
});

test('server audit publishes the broad regression after dependency skip correction', async () => {
    const event = statusData.events.find(item => item.id === 'server-audit-fullsuite-dependency-skip-2026-10-20-0716');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /5\.071 Passed, 67 NotExecuted, 0 Failed\/5\.138/);
    assert.match(event.evidence, /agregação dos 17 TRX/);
    assert.match(event.evidence, /Os 67 restantes são dependentes de plataforma ou pré-condições e continuam skips, não aprovações/);
    assert.match(event.evidence, /não substitui a rodada anterior inclusiva com Integration/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /suíte \.NET ampla confirma a remoção do falso skip/);
});

test('server audit publishes MariaDB user and billing focused rerun without changing the broad snapshot', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-mariadb-user-billing-rerun-2026-10-20-0723');

    assert.ok(event);
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /30 aprovados, 1 NotExecuted e 0 falhas\/31/);
    assert.match(event.evidence, /MariaDB 11\.4\.4.*bind 127\.0\.0\.1 e porta 33099/);
    assert.match(event.evidence, /EnsureSchemaCreated_UsesEfMappedUsersTableWithBinaryUsernameCollations.*exige Linux/);
    assert.match(event.evidence, /não alteram o snapshot amplo nem reclassificam NotExecuted nele/);
    assert.match(server.testAudit.label, /MariaDB focal anterior: 197\/198 opt-in em Windows/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /MariaDB usuários\/cobrança 30\/31/);
});

test('server audit classifies every residual NotExecuted without reclassifying the broad snapshot', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-audit-residual-skips-2026-10-20-0729');

    assert.ok(event);
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /17 TRX confirmou 5\.071 Passed, 67 NotExecuted e 0 Failed\/5\.138/);
    assert.match(event.evidence, /31 MariaDB opt-in, 24 MongoDB opt-in, 10 testes de plataforma\/filesystem e 2 benchmarks/);
    assert.match(event.evidence, /MariaDB 30\/31.*MongoDB 24\/24; não alteram os NotExecuted do snapshot amplo/);
    assert.match(event.evidence, /3 `AvatarFileStoreTests` Linux, 1 teste Unix de permissões e 6 `ManagedFileSystemTests`/);
    assert.match(event.evidence, /`wsl\.exe --status` confirmou WSL não instalado/);
    assert.match(event.evidence, /CI `39037932557` e Release `39212993752` com jobs failure e zero steps executados/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /67 NotExecuted classificados; Linux e benchmarks seguem sem execução/);
});

test('server publishes the Nebula cryptography audit and does not claim production deployment', () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-nebula-cryptography-security-audit-2026-10-20-0743');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /cryptography>=43,<46/);
    assert.match(event.evidence, /cryptography>=50\.0\.2,<51/);
    assert.match(event.evidence, /62 dependências.*não encontrou advisories conhecidos/);
    assert.match(event.evidence, /suíte Nebula: 647\/647 tanto no Python local quanto no ambiente uv isolado/);
    assert.match(event.evidence, /nenhum runtime\/serviço de produção foi inspecionado ou atualizado/);
    assert.match(event.evidence, /requirements\.in e requirements\.lock.*não estão presentes/);
    assert.match(event.evidence, /Homologação formal e release seguem abertas/);
    assert.match(server.testAudit.label, /NebulaPython 3\.10 isolado: 685\/685/);
    assert.match(server.testAudit.label, /10 altas somente dev.*braces@3\.0\.3/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records release revalidation, blocking GitHub Actions billing state', async () => {
    const event = statusData.events.find(item => item.id === 'server-release-flow-recheck-2026-10-21-0019');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /v12\.1\.26 publicada em main/);
    assert.match(event.evidence, /97\/97/);
    assert.match(event.evidence, /418\/418 em 75 arquivos/);
    assert.match(event.evidence, /conta está bloqueada por cobrança/);
    assert.match(event.evidence, /Não há código novo sem release/);
    assert.match(event.evidence, /nenhuma instalação ou alteração de produção foi feita/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /release v12\.1\.26 revalidada; Actions bloqueado por cobrança/);
});

test('portal records Vite security patch and keeps production risk claims scoped', async () => {
    const server = statusData.tracks.find(track => track.id === 'server');
    const event = statusData.events.find(item => item.id === 'server-frontend-vite-security-audit-2026-10-21-0350');

    assert.ok(event);
    assert.equal(server.status, 'in_progress');
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /Vite 7\.3\.6 foi atualizado para 7\.3\.7/);
    assert.match(event.evidence, /audit completo 11 dev.*produção segue 0/);
    assert.match(event.evidence, /Vitest 418\/418 em 75 arquivos/);
    assert.match(event.evidence, /1\.926 artefatos e orçamento inicial 294,3 KiB gzip\/420 KiB/);
    assert.match(event.evidence, /Release GitHub v12\.1\.30 publicada/);
    assert.match(event.evidence, /Pester do runtime Nebula 1\/1 e contratos Node do package builder 2\/2/);
    assert.match(event.evidence, /sem \.coverage\/\.ruff_cache/);
    assert.match(event.evidence, /Linux nativo, CI remoto, instalação\/upgrade, produção e playback não foram verificados/);
    assert.match(event.release, /v12\.1\.30/);
    assert.match(event.links[0], /releases\/tag\/v12\.1\.30/);
    assert.match(event.evidence, /nenhuma instalação ou alteração em produção/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /advisories do Vite e auditoria npm/);
});

test('portal records server release 12.1.31 with fail-closed backup restore and honest validation limits', async () => {
    const event = statusData.events.find(item => item.id === 'server-release-12-1-31-backup-semantic-validation-2026-10-21-0506');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /FullSystemBackup 36\/36/);
    assert.match(event.evidence, /1\.512 aprovados, 65 ignorados, zero falhas/);
    assert.match(event.evidence, /vulnerabilidades em dependências de desenvolvimento/);
    assert.match(event.evidence, /Linux foi cross-published em Windows/);
    assert.match(event.evidence, /Backup integral continua parcial/);
    assert.match(event.evidence, /produção não foram homologados/);
    assert.match(event.release, /v12\.1\.31/);
    assert.match(event.links[0], /releases\/tag\/v12\.1\.31/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Release servidor v12\.1\.31 publicada/);
});

test('portal records server release 12.1.32 with semantic JSON restore validation and package digests', async () => {
    const event = statusData.events.find(item => item.id === 'server-release-12-1-32-backup-json-validation-2026-10-21-0600');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /FullSystemBackup 39\/39/);
    assert.match(event.evidence, /1\.515 aprovados, 65 ignorados, zero falhas/);
    assert.match(event.evidence, /JSON relacional/);
    assert.match(event.evidence, /Linux foi cross-published em Windows/);
    assert.match(event.evidence, /homologação em produção não foram executados/);
    assert.match(event.evidence, /42DE6940B6D45FBE8DD9CF324243AACFFC149DC5C0F6B933025389161BAAF48C/);
    assert.match(event.release, /v12\.1\.32/);
    assert.match(event.links[0], /releases\/tag\/v12\.1\.32/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Release servidor v12\.1\.32 publicada/);
});

test('portal records the published v12.1.33 notification brand fix and its billing-blocked CI limits', () => {
    const event = statusData.events.find(item => item.id === 'server-release-12-1-33-notification-branding-2026-10-21-0920');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.scope, /ícone e badge da marca MulletaFlix/);
    assert.match(event.evidence, /419\/419 em 76 arquivos/);
    assert.match(event.evidence, /sem asset notificationicon\.png/);
    assert.match(event.evidence, /Release pública v12\.1\.33 não-draft publicada/);
    assert.match(event.evidence, /BBACA4D57CCE73A0E93195FC269A1855B7A09BF6EC1564A8A5414687C3CCCD58/);
    assert.match(event.evidence, /bloqueio de cobrança da conta/);
    assert.match(event.release, /v12\.1\.33/);
    assert.match(event.links[0], /releases\/tag\/v12\.1\.33/);
    assert.match(event.evidence, /suíte remota \.NET\/Nebula não executada/);
    assert.match(event.evidence, /produção não foram testados/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the published v12.1.34 backup test isolation release and validation limits', () => {
    const event = statusData.events.find(item => item.id === 'server-release-12-1-34-backup-storage-test-isolation-2026-10-21-0714');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.scope, /Isolar a leitura de espaço livre/);
    assert.match(event.evidence, /FullSystemBackup 40\/40/);
    assert.match(event.evidence, /5091 aprovados, 68 ignorados, 0 falhas/);
    assert.match(event.evidence, /BAD1D73C7385A370C61EFF24C19FD5776C9353ECB6EAA07E67F2FC39F86EDBBC/);
    assert.match(event.evidence, /instalação limpa\/elevada.*produção não foram validados/);
    assert.match(event.release, /v12\.1\.34/);
    assert.match(event.links[0], /releases\/tag\/v12\.1\.34/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records full solution validation and keeps the release gate blocked', () => {
    const event = statusData.events.find(item => item.id === 'server-release-validation-suite-and-brand-audit-2026-10-21-0859');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'blocked');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /MulletaFlix\.sln -c Release --no-build terminou com exit 0/);
    assert.match(event.evidence, /Build completo.*273 avisos.*0 erros/);
    assert.match(event.evidence, /5\.110 testes Passed, 248 NotExecuted.*0 Failed, 5\.358 total/);
    assert.match(event.evidence, /1\.518 aprovados, 65 ignorados/);
    assert.match(event.evidence, /805 aprovados, 13 integrações externas ignoradas/);
    assert.match(event.evidence, /v12\.1\.33 já registra a correção de branding/);
    assert.match(event.evidence, /66 itens pendentes e 4 em andamento/);
    assert.match(event.evidence, /Nenhum pacote, commit, tag ou GitHub Release do servidor foi criado/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal renders the Nebula Telegram acceptance and Mongo checkpoint ambiguity as unresolved', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-ambiguous-telegram-checkpoint-2026-10-21-1114');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /repete sendDocument após exceções de transporte/);
    assert.match(event.evidence, /falha Mongo/);
    assert.match(event.evidence, /Isto é risco estático, não evidência de duplicata em produção/);
    assert.match(event.evidence, /retry simples não cobre crash nem resposta perdida/);
    assert.match(event.evidence, /Release 1\.517 aprovados, 65 ignorados, 0 falhas/);
    assert.match(event.evidence, /cinco grupos Category=RequiresMongo passaram 25\/25 contra MongoDB efêmero restrito a 127\.0\.0\.1:27099/);
    assert.match(event.evidence, /não cobre perda de resposta após aceite Telegram nem falha de checkpoint pós-aceite/);
    assert.match(event.evidence, /MariaDB e topologia\/credenciais Supabase de produção continuam pendentes/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    const renderedEvents = dashboard.getElement('event-list').innerHTML;
    assert.match(renderedEvents, /Nebula: risco de parte Telegram sem checkpoint Mongo/);
    assert.match(renderedEvents, /Em execução/);
});

test('portal reports durable Telegram acknowledgement recovery without overstating exactly-once delivery', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-upload-local-journal-2026-10-21-1459');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /journal local versionado por UUID/i);
    assert.match(event.evidence, /NebulaUploadCheckpointJournal 4\/4/);
    assert.match(event.evidence, /integração com Mongo descartável\/failpoint e Bot API simulada 1\/1/);
    assert.match(event.evidence, /opt-in Mongo 26\/26/);
    assert.match(event.evidence, /suíte Nebula Release 736\/736, 0 ignorados e 0 falhas/);
    assert.match(event.evidence, /Retentativas automáticas mantidas conforme decisão do usuário/);
    assert.match(event.evidence, /sem release/);
    assert.match(event.evidence, /ainda pode duplicar/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal reports the full solution regression without claiming formal homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-checkpoint-full-solution-regression-2026-10-21-1508');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /MulletaFlix\.sln -c Release --no-restore terminou com exit code 0/);
    assert.match(event.evidence, /Providers 821 aprovados/);
    assert.match(event.evidence, /Server\.Implementations 1\.524 aprovados\/65 ignorados/);
    assert.match(event.evidence, /nenhum teste de integração Telegram foi executado/);
    assert.match(event.evidence, /não consolida homologação formal nem autoriza release/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal evidence for partial STRM indexing reports the latest focused Release retest', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-partial-strm-index-2026-10-21');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.match(event.evidence, /NebulaMediaSuggestionCatalogTests 4\/4/);
    assert.match(event.evidence, /NebulaMediaSuggestionTests 10\/10/);
    assert.match(event.evidence, /Sem ACL real, instalação, CI remota ou produção validadas/);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal reports ambiguous Telegram recovery as in progress pending live MTProto homologation', async () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-ambiguous-telegram-reconciliation-2026-10-21-1553');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.evidence, /teste de resposta perdida\/reinício passou 1\/1/);
    assert.match(event.evidence, /NebulaQueueConcurrencyMongoTests \+ NebulaUploadCheckpointJournalTests passaram 25\/25/);
    assert.match(event.evidence, /removia o _id do \$setOnInsert/);
    assert.match(event.evidence, /Retentativas automáticas mantidas/);
    assert.match(event.evidence, /busca MTProto real.*homologação formal seguem pendentes/);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /reconciliação de envio após resposta Telegram perdida/);
});

test('portal reports backup restore reparse-point defense without closing formal homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-backup-restore-reparse-defense-2026-10-21-1641');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /FullSystemBackup 44\/44/);
    assert.match(event.evidence, /49\/49 combinados/);
    assert.match(event.evidence, /crash\/power-loss recovery/);
    assert.match(event.evidence, /fencing de lease_id/);
    assert.match(event.evidence, /2\/7 \(28,6%\)/);
    assert.match(event.evidence, /Nenhum release do servidor criado/);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal distinguishes reparse-point protection in the primary checkout from the candidate transaction helper', () => {
    const event = statusData.events.find(item => item.id === 'server-backup-restore-reparse-points-2026-10-22-0009');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.location, /BackupService\.RestoreBackupCoreAsync\.CopyDirectory/);
    assert.match(event.evidence, /FullSystemBackup Release: 40\/40/);
    assert.match(event.evidence, /TOCTOU/);
    assert.match(event.evidence, /64a33dcf, 8 commits atrás/);
    assert.match(event.release, /Nenhuma release/);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records Nebula upload lease fencing without claiming production homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-upload-lease-fencing-2026-10-21-1710');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, null);
    assert.match(event.scope, /leaseId/);
    assert.match(event.evidence, /lease_until > now/);
    assert.match(event.evidence, /Python Nebula 665\/665/);
    assert.match(event.evidence, /workers focados 19\/19/);
    assert.match(event.evidence, /Testes .NET Release direcionados 313\/313, 0 ignorados\/falhas/);
    assert.match(event.evidence, /NebulaStreamEngineTests 69\/69/);
    assert.match(event.evidence, /dotnet format --verify-no-changes passou para implementação e testes focados/);
    assert.match(event.evidence, /sem upload real, CI remota, instalação, produção ou release/i);
    assert.match(event.evidence, /homologação formal global continua 2\/7 \(28,6%\)/);
    assert.match(event.evidence, /Retentativas automáticas permanecem habilitadas/);
    assert.match(event.evidence, /exactly-once não é garantido/);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records Python Telegram retry reconciliation while formal homologation stays open', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-python-ambiguous-retry-audit-2026-10-21-1820');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.title, /reconciliação de retries ambíguos também no motor Python/);
    assert.match(event.location, /StartPythonStreamServiceAsync/);
    assert.match(event.location, /upload_checkpoint\.py/);
    assert.match(event.evidence, /Python 3\.10: suíte completa 671\/671/);
    assert.match(event.evidence, /confirmação fora de ordem sem duplicação/);
    assert.match(event.evidence, /resposta perdida sem segundo POST/);
    assert.match(event.evidence, /Pester de cópia de runtime passou 1\/1/);
    assert.match(event.evidence, /Ainda sem Telegram\/Mongo remotos, instalação\/runtime, CI remota ou produção/);
    assert.match(event.evidence, /Retentativas automáticas permanecem/);
    assert.match(event.evidence, /Nenhum release do servidor criado/);
    assert.match(event.evidence, /Revalidação focal desta sessão: 35\/35 testes passaram/);
    assert.match(event.evidence, /árvore principal local está 8 commits atrás/);
    assert.match(event.evidence, /worktree gerenciada ainda não está integrada à árvore principal/);
    assert.match(event.evidence, /Homologação formal permanece 2\/7 \(28,6%\)/);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the Mongo queue identity regression without claiming execution or homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-queue-identity-regression-2026-10-21-1857');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /113 aprovados, 1 ignorado, 0 falhas/);
    assert.match(event.evidence, /A regressão compilou, mas não executou/);
    assert.match(event.evidence, /Sem release, instalação ou produção/);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records checkpoint write-failure coverage without treating local tests as formal acceptance', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-checkpoint-failure-tests-2026-10-21-1908');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /[Tt]este focal do journal 7\/7; suíte NebulaPython completa 673\/673/);
    assert.match(event.evidence, /Falhas injetadas em fsync\/os\.replace mantêm o checkpoint anterior recuperável/);
    assert.match(event.evidence, /Alteração somente de testes/);
    assert.match(event.evidence, /permanece local, não foi enviada ao repositório do servidor/);
    assert.match(event.evidence, /Homologação formal segue 2\/7 \(28,6%\)/);
    assert.match(event.evidence, /nenhuma release criada/);
    assert.equal(server.homologation.percent, 28.6);
    assert.equal(server.status, 'in_progress');
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal distinguishes locally validated Nebula automatic retry from formal server acceptance', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-auto-retry-regression-and-full-audit-2026-10-21-2146');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /Testes focados checkpoint\/scanner 22\/22/);
    assert.match(event.evidence, /NebulaPython completa passou 683\/683/);
    assert.match(event.evidence, /5\.120 aprovados, 236 ignorados, 0 falhas\/5\.356/);
    assert.match(event.evidence, /Sem Telegram\/Mongo operacional/);
    assert.match(event.evidence, /Nenhuma release criada ou publicada/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the latest focused Python retry validation without promoting formal homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-telegram-automatic-retry-revalidation-2026-10-22-0237');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.local, /Python 3\.10 em venv temporário isolado/);
    assert.match(event.evidence, /suíte focal.*passou 63\/63/);
    assert.match(event.evidence, /retorno automático à fila após 60 s/);
    assert.match(event.evidence, /sem garantia exactly-once/);
    assert.match(event.evidence, /Homologação formal permanece 1\/7 \(14,3%\)/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records C# checkpoint concurrency fix without claiming integration or release', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-csharp-journal-concurrency-2026-10-21-2322');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.location, /NebulaUploadCheckpointJournal/);
    assert.match(event.evidence, /journal 7\/7/);
    assert.match(event.evidence, /10\/10/);
    assert.match(event.evidence, /247\/247/);
    assert.match(event.evidence, /worktree destacada suja/);
    assert.match(event.evidence, /reconciliação limitada aos três bots/);
    assert.match(event.evidence, /Sem Mongo\/Telegram reais/);
    assert.match(event.evidence, /Nenhuma release criada\/publicada/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records full server regression and Mongo TCP limits without granting formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-full-regression-library-gate-test-race-2026-10-22-0335');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /Reprodução isolada passou 1\/1/);
    assert.match(event.evidence, /API Release passou 763 aprovados, 3 ignorados, 0 falhas/);
    assert.match(event.evidence, /nova solução Release --no-restore --no-build terminou exit 0/);
    assert.match(event.evidence, /NebulaPython 684\/684/);
    assert.match(event.evidence, /TCP 127\.0\.0\.1:27017 acessível agora/);
    assert.match(event.evidence, /autenticação, query, cursor e Supabase não testados/);
    assert.match(event.evidence, /oito commits atrás de origin\/main\/v12\.1\.35/);
    assert.match(event.evidence, /Homologação formal permanece 1\/7 \(14,3%\)/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records restore crash-recovery evidence without marking formal homologation complete', () => {
    const event = statusData.events.find(item => item.id === 'server-fullsystembackup-crash-recovery-replay-2026-10-22-0404');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.location, /BackupRestoreRecoveryJournal/);
    assert.match(event.evidence, /BackupServiceTests Release: 41\/41/);
    assert.match(event.evidence, /1\.541 aprovados, 66 ignorados, 0 falhas\/1\.607/);
    assert.match(event.evidence, /sidecars \.bak e \.absent conflitantes falham fechado/);
    assert.match(event.evidence, /não simulam kill\/restart real/);
    assert.match(event.evidence, /Sem MariaDB descartável nesta rodada/);
    assert.match(event.evidence, /Homologação formal permanece 1\/7 \(14,3%\)/);
    assert.match(event.release, /Nenhuma release/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the open restore TOCTOU risk without promoting formal homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-toctou-audit-2026-10-22-0942');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /FullSystemBackup recompilou e passou 50\/50/);
    assert.match(event.evidence, /TOCTOU ainda aberto/);
    assert.match(event.evidence, /teste atual só cobre link estático/);
    assert.match(event.evidence, /NtCreateFile é API winternl interna sujeita a mudanças/);
    assert.match(event.evidence, /exige RequiresElevation \(papel Administrator\)/);
    assert.match(event.evidence, /não a ACL de uma instalação real/);
    assert.match(event.evidence, /Não há evidência de exploração remota/);
    assert.match(event.evidence, /ServiceDataAcl\.Tests\.ps1 passou/);
    assert.match(event.evidence, /ProtectedApiSurfacesHttpTests passou 2\/2/);
    assert.match(event.evidence, /não a ACL de uma instalação real/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the latest 50/50 restore test revalidation without claiming a real process restart', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-recovery-test-revalidation-2026-10-22-0958');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /passou 50\/50, zero ignorados\/falhas/);
    assert.match(event.evidence, /nenhum processo foi encerrado\/reiniciado/);
    assert.match(event.evidence, /Homologação formal permanece 1\/7 \(14,3%\)/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the TMDb all-language artwork fix without claiming a release or formal approval', () => {
    const event = statusData.events.find(item => item.id === 'server-tmdb-all-languages-artwork-fix-2026-10-22-1040');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.scope, /todas as línguas/);
    assert.match(event.evidence, /passou 39\/39/);
    assert.match(event.evidence, /IncludeAllLanguages/);
    assert.match(event.evidence, /coleção precisa de null/);
    assert.match(event.evidence, /Formatação verify-no-changes e diff-check restrito passaram/);
    assert.match(event.evidence, /Sem chamada TMDb autenticada/);
    assert.match(event.evidence, /Homologação formal permanece 1\/7/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the latest focal server regressions without changing formal homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-artwork-focal-2026-10-22-1120');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /filtro de replay\/interrupção: 2\/2/);
    assert.match(event.evidence, /EnumerableExtensionsTests: 7\/7/);
    assert.match(event.evidence, /ProviderManagerTests: 73\/73/);
    assert.match(event.evidence, /TOCTOU continua pendente/);
    assert.match(event.evidence, /Homologação formal permanece 1\/7/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records Portuguese image preference with English fallback without claiming live TMDb validation', () => {
    const event = statusData.events.find(item => item.id === 'server-tmdb-ptbr-fallback-revalidation-2026-10-22-1216');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.scope, /pt-BR/);
    assert.match(event.evidence, /154 aprovados/);
    assert.match(event.evidence, /inglês permanece disponível/);
    assert.match(event.evidence, /Nenhuma chamada autenticada ao TMDb/);
    assert.match(event.evidence, /Homologação formal permanece 1\/7 \(14,3%\)/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records global preferred-language fallback for artwork without formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-artwork-language-fallback-global-2026-10-22-1130');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.scope, /prioriza pt\/pt-BR/);
    assert.match(event.scope, /agrega imagens de todos os provedores/);
    assert.match(event.evidence, /ProviderManagerTests Release 75\/75/);
    assert.match(event.evidence, /ItemImageProviderTests\.RefreshImages 36\/36/);
    assert.match(event.evidence, /GetAvailableRemoteImages 4\/4/);
    assert.match(event.evidence, /Sem API TMDb autenticada/);
    assert.match(event.evidence, /Homologação formal permanece 1\/7/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal publishes TMDb TV image-language coverage without claiming live validation', () => {
    const event = statusData.events.find(item => item.id === 'server-tmdb-tv-image-languages-2026-10-22-1208');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.scope, /séries, temporadas e episódios/);
    assert.match(event.evidence, /TmdbUtilsTests 25\/25/);
    assert.match(event.evidence, /Sem API TMDb autenticada\/live/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records backup restore FK preflight without formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-backup-restore-fk-preflight-2026-10-22-1228');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /BackupServiceTests Release: 44\/44/);
    assert.match(event.evidence, /2 aprovados e 1 ignorado/);
    assert.match(event.evidence, /todas as 39 FKs/);
    assert.match(event.evidence, /Homologação formal permanece 1\/7 \(14,3%\)/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records restore TOCTOU API research without claiming mitigation or formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-toctou-api-revalidation-2026-10-22-1148');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /Nenhuma solução multiplataforma foi aprovada ou implementada/);
    assert.match(event.evidence, /LyricManager\.UploadLyrics/);
    assert.match(event.evidence, /Homologação formal segue 1\/7/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records media-sync path containment while keeping local TOCTOU open', () => {
    const event = statusData.events.find(item => item.id === 'server-media-sync-path-containment-2026-10-22-1450');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.scope, /sync manual e agendado/);
    assert.match(event.evidence, /symlinks dangling/);
    assert.match(event.evidence, /TOCTOU local permanece/);
    assert.match(event.evidence, /Homologação formal do servidor segue 1\/7 \(14,3%\)/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records restore archive identity race fix without closing formal homologation', async () => {
    const event = statusData.events.find(item => item.id === 'server-backup-restore-open-archive-identity-2026-10-22');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /FullSystemBackup Release passou 54\/54/);
    assert.match(event.evidence, /MariaDB descartável foram ignorados/);
    assert.match(event.evidence, /TOCTOU das operações de extração continua aberto/);
    assert.equal(server.homologation.percent, 28.6);

    const dashboard = createDashboard();
    await settleDashboard();
    assert.match(dashboard.getElement('event-list').innerHTML, /Restore registra a identidade do ZIP já aberto/);
});

test('portal reports the full server suite after correcting the OTLP restore fixture without overstating formal homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-otlp-test-fixture-2026-10-22-1546');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /solução completa em Release terminou exit 0/);
    assert.match(event.evidence, /5\.180 aprovados, 237 ignorados, 0 falhas\/5\.417/);
    assert.match(event.evidence, /FullSystemBackup 54\/54/);
    assert.match(event.evidence, /não há prova desses ambientes/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the restore interprocess lease and MariaDB cleanup limits without formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-interprocess-lease-2026-10-22-1701');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /FileShare\.None/);
    assert.match(event.evidence, /FullSystemBackup Release passou 61\/61/);
    assert.match(event.evidence, /DROP DATABASE usa CancellationToken\.None/);
    assert.match(event.evidence, /0 aprovados\/1 ignorado/);
    assert.match(event.evidence, /Linux\/mounts/);
    assert.match(event.evidence, /TOCTOU na árvore de destino permanece P0/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal distinguishes full .NET regression from the Nebula Python environment blocker', () => {
    const event = statusData.events.find(item => item.id === 'server-full-solution-regression-python-runtime-blocked-2026-10-22-1722');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /dotnet test MulletaFlix\.sln .* terminou exit code 0/);
    assert.match(event.evidence, /Providers 848\/848/);
    assert.match(event.evidence, /Server Implementations 1\.552 aprovados, 66 ignorados/);
    assert.match(event.evidence, /Python 3\.14: `py -3\.14 -m pytest tests -q` passou 685\/685/);
    assert.match(event.evidence, /py -3\.10 -m pytest tests -q.*0 testes executados/s);
    assert.match(event.evidence, /homologação formal do servidor permanece 1\/7 \(14,3%\)/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records restore path API limits and focal suite without formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-path-primitives-reevaluation-2026-10-22-1729');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /FullSystemBackup.*passou 61\/61/);
    assert.match(event.evidence, /não simulam a troca concorrente/);
    assert.match(event.evidence, /RESOLVE_NO_XDEV.*bloquear mounts\/bind mounts/);
    assert.match(event.evidence, /combinação user-mode permanece ambígua/);
    assert.match(event.evidence, /não encontrou `mariadbd`, `mysqld`, Docker ou WSL\/distro/);
    assert.match(event.evidence, /Homologação formal permanece 1\/7 \(14,3%\)/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records current server regression totals without changing formal homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-full-regression-safe-scope-2026-10-22-1741');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /17 TRX.*5\.158 Passed, 69 NotExecuted, 0 Failed, total 5\.227/);
    assert.match(event.evidence, /Nebula Python 3\.10 isolado passou 685\/685/);
    assert.match(event.evidence, /Nenhuma alteração de runtime e nenhum release/);
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.equal(server.testAudit.percent, 95.4);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal publishes the restore gate rerun without claiming the skipped MariaDB integration', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-gate-rerun-2026-10-22-1850');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.equal(event.progressPercent, null);
    assert.match(event.evidence, /FullSystemBackup Release passou 61\/61/);
    assert.match(event.evidence, /2 passaram e 2 foram ignorados/);
    assert.match(event.evidence, /crash\/restart após commit relacional não foi executado/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records TMDb English fallback rerun without claiming visual media validation', () => {
    const event = statusData.events.find(item => item.id === 'server-tmdb-fallback-confirmation-2026-10-23-1010');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.front, 'server');
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.local, /27\/27/);
    assert.match(event.evidence, /não houve chamada ao TMDb/);
    assert.match(event.evidence, /[Ii]magens antigas não são atualizadas em massa/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records media sync locking and atomic manifest persistence without formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-media-sync-manifest-persistence-2026-10-23-1159');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.local, /69\/69.*858\/858/);
    assert.match(event.evidence, /15 minutos/);
    assert.match(event.evidence, /substituição atômica/);
    assert.match(event.release, /Nenhuma/);
    assert.match(event.release, /não garante FIFO/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records manifest preservation after incomplete M3U link validation without formal credit', () => {
    const event = statusData.events.find(item => item.id === 'server-sync-manifest-preserve-on-validation-failure-2026-10-23-1219');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.local, /manifesto 4\/4.*Providers 862 aprovados, 13 ignorados/);
    assert.match(event.evidence, /ad[ií]a a limpeza/i);
    assert.match(event.evidence, /playlist inesperadamente vazia/);
    assert.match(event.evidence, /solução Release.*exit code 0/);
    assert.match(event.evidence, /saída agregada foi truncada/);
    assert.match(event.evidence, /Homologação formal permanece 2\/7 \(28,6%\)/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records Linux packaging CI coverage without formal homologation credit', () => {
    const event = statusData.events.find(item => item.id === 'server-linux-packaging-ci-coverage-2026-10-23-1306');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.local, /contrato de workflow 8\/8/);
    assert.match(event.evidence, /Git Bash/);
    assert.match(event.evidence, /execução hospedada do GitHub ainda não observada/);
    assert.match(event.release, /Nenhuma release/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal publishes the candidate relative-I/O contract without claiming the TOCTOU fix', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-relative-io-contract-2026-10-23-1334');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.evidence, /openat\(O_DIRECTORY \| O_NOFOLLOW\)/);
    assert.match(event.evidence, /Ubuntu 20\.04\/kernel GA 5\.4/);
    assert.match(event.evidence, /FullSystemBackup passou 62\/62/);
    assert.match(event.evidence, /não testa troca concorrente determinística/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal reports incremental restore-root hardening without formal signoff', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-relative-io-prototype-2026-10-23-1358');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'in_progress');
    assert.match(event.local, /79 aprovados, 2 ignorados \(Linux-only\), 0 falhas/);
    assert.match(event.evidence, /rejeita reparse points/);
    assert.match(event.evidence, /statx\(AT_SYMLINK_NOFOLLOW, STATX_TYPE\)/);
    assert.match(event.evidence, /mkdirat.*openat/);
    assert.match(event.evidence, /statx→unlinkat/);
    assert.match(event.evidence, /sem fallback por pathname/);
    assert.match(event.release, /pathname-based/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal reports the latest focused restore rerun without crediting formal homologation', () => {
    const event = statusData.events.find(item => item.id === 'server-restore-handle-rerun-2026-10-23-1530');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.match(event.local, /80 aprovados, 3 ignorados \(Linux-only\), 0 falhas/);
    assert.match(event.evidence, /continua sem caller no restore ativo/);
    assert.match(event.evidence, /Linux nem teste determinístico de troca concorrente/);
    assert.match(event.release, /Nenhuma/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the image-language fallback fix without claiming release or formal signoff', () => {
    const event = statusData.events.find(item => item.id === 'server-image-refresh-english-fallback-2026-10-23-1603');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.local, /ItemImageProviderTests \+ ProviderManagerTests 137\/137/);
    assert.match(event.evidence, /IncludeAllLanguages=false/);
    assert.match(event.evidence, /galeria manual segue usando o filtro restrito/);
    assert.match(event.release, /Nenhuma release/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records the Nebula downloader early-exit retry without claiming runtime or formal signoff', () => {
    const event = statusData.events.find(item => item.id === 'server-nebula-downloader-early-exit-retry-2026-10-23-1612');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.local, /NebulaDownloaderStartupTests \+ NebulaHostedServiceConfigurationTests 48\/48/);
    assert.match(event.evidence, /IOException/);
    assert.match(event.evidence, /um chamador de produção/);
    assert.match(event.release, /Sem smoke do worker real, scan STRM, transferência/);
    assert.match(event.release, /Nenhuma release/);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});

test('portal records full .NET regression without granting formal restore credit', () => {
    const event = statusData.events.find(item => item.id === 'server-full-solution-regression-2026-10-23-1642');
    const server = statusData.tracks.find(track => track.id === 'server');

    assert.ok(event);
    assert.equal(event.status, 'completed');
    assert.equal(event.progressPercent, 100);
    assert.match(event.local, /5\.241 aprovados, 253 ignorados, 0 falhas\/5\.494 resultados em 17 projetos/);
    assert.match(event.evidence, /dotnet test MulletaFlix\.sln.*exit 0/);
    assert.match(event.evidence, /3 ignorados \(Linux-only\), 0 falhas\/83/);
    assert.match(event.release, /TOCTOU\/ACL P0.*continua aberto/);
    assert.equal(server.testAudit.passed, 5241);
    assert.equal(server.testAudit.total, 5494);
    assert.equal(server.testAudit.skipped, 253);
    assert.equal(server.testAudit.failed, 0);
    assert.equal(server.homologation.completed, 2);
    assert.equal(server.homologation.total, 7);
    assert.equal(server.homologation.percent, 28.6);
    assert.ok(Date.parse(event.updatedAt) <= Date.parse(statusData.generatedAt));
});
