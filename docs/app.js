const I18N = {
  pt: {
    nav_story: 'A Origem',
    nav_features: 'Funcionalidades',
    nav_executive: 'Relatório Executivo',
    nav_manual: 'Manual de Uso',
    nav_sibling: '🔥 Hooksmith',
    nav_shortcuts: 'Atalhos',
    badge_local: '100% Local & Offline',
    badge_privacy: 'Zero Nuvem • Segredos Protegidos',
    badge_dev: 'Para Devs, Tech Leads & Gestores',
    badge_oss: '💚 100% Open Source (MIT)',
    hero_title: 'A Forja Local de <span class="accent">Smoke & Load Tests</span> sem complexidade.',
    hero_subtitle:
      'Valide fluxos completos de API, simule picos de carga concorrente, compare Antes vs. Depois e gere Relatórios Executivos claros para tomada de decisão — direto no seu desktop.',
    cta_download: '⬇️ Baixar (Win / Mac / Linux)',
    cta_manual: '📖 Ler Manual de Uso',
    cta_github: '⭐ Ver no GitHub',
    car_eyebrow: '📸 INTERFACE REAL DA APLICAÇÃO',
    car_t1: 'Workspace & Cenários',
    car_d1:
      '<strong>1. Workspace & Cenários:</strong> Visão geral limpa com alternância rápida entre Smoke e Carga, resumo de SLA, seletor de idioma e comando CLI pronto para automação.',
    car_t2: 'Editor Visual, .env & CSV',
    car_d2:
      '<strong>2. Editor Visual de Cenários:</strong> Configure passos, ignore certificados SSL autoassinados locais, detecte chaves <code>.env</code> automaticamente e alimente testes realistas via CSV.',
    car_t3: 'Telemetria em Tempo Real',
    car_d3:
      '<strong>3. Telemetria ao Vivo:</strong> Monitore RPS, latências p50/p95/p99, taxa de erro, VUs ativos e aprovação automática de SLA janela a janela.',
    car_t4: 'Relatório Executivo & Pico',
    car_d4:
      '<strong>4. Relatório Executivo:</strong> Traduz métricas técnicas para linguagem de negócio com Simulador de Meta (ex.: Black Friday) e exportação em PDF ou HTML.',
    sim_hint:
      '💡 Simulador Interativo: Clique nos eventos do Live Stream ou alterne entre Telemetria, YAML e Simulador Executivo abaixo!',
    story_eyebrow: '☕ DE DEV PARA DEV & LIDERANÇA',
    story_title: 'Nascido da dor real entre ferramentas pesadas e a pergunta da Black Friday',
    story_desc:
      'Todo time passa pelo mesmo sufoco antes de uma grande campanha ou deploy crítico: validar se o fluxo não quebrou e provar se o servidor aguenta o pico.',
    pain_title: '❌ O Sofrimento Antigo (JMeter, Scripts & SaaS)',
    pain_1:
      '<strong>O Labirinto do JMeter:</strong> Telas travadas dos anos 2000, arquivos XML gigantescos impossíveis de revisar em Pull Request e alto consumo de memória.',
    pain_2:
      '<strong>Barreira de Código (k6 / Gatling):</strong> Precisar programar scripts inteiros só para encadear um Login + Criação de Pedido com massa CSV antes de subir uma release.',
    pain_3:
      '<strong>Risco de Credenciais na Nuvem:</strong> Subir tokens de homologação, arquivos <code>.env</code> e URLs internas da empresa para plataformas SaaS externas cobradas por usuário virtual.',
    pain_4:
      '<strong>O Abismo com a Gestão:</strong> Terminar o teste cheio de siglas (<code>p95</code>, <code>p99</code>, <code>RPS</code>) e ouvir do diretor: <em>"Mas vai aguentar 15 mil compras por minuto ou vai cair?"</em>',
    forge_title: '⚡ O Jeito LoadSmith',
    forge_1:
      '<strong>Editor Visual + YAML Limpo no Git:</strong> Monte cenários com formulários intuitivos ou importe um <code>cURL</code> em 1 clique, mantendo arquivos YAML legíveis para toda a equipe.',
    forge_2:
      '<strong>Smoke & Carga no Mesmo Lugar:</strong> Valide o fluxo passo a passo com Smoke Fail-Fast e vire uma chave para simular dezenas ou centenas de usuários simultâneos.',
    forge_3:
      '<strong>Segredos <code>.env</code> & CSV 100% Locais:</strong> Suas senhas e tokens ficam apenas no seu disco local e nunca aparecem expostos na tela nem nos cenários.',
    forge_4:
      '<strong>Relatório Executivo com Simulador de Pico:</strong> Traduza números técnicos em capacidade por minuto, percepção do cliente na tela e veredito em PDF ou HTML.',
    feat_eyebrow: '🚀 FUNCIONALIDADES PRINCIPAIS',
    feat_title: 'Da primeira rota testada ao veredito executivo',
    feat_subtitle:
      'Projetado para unir produtividade de desenvolvedor, rigor estatístico em tempo real e clareza de negócio em um único app local.',
    f1_title: 'Editor Visual & Código Sincronizados',
    f1_desc:
      'Crie passos, headers, body JSON, asserções de status/tempo e extração de variáveis (<code>{{token}}</code>) sem código, ou edite o YAML com validação em tempo real.',
    f2_title: 'Importação Instantânea de cURL',
    f2_desc:
      'Copie qualquer requisição do Chrome DevTools, Postman ou Insomnia como cURL, cole no LoadSmith e o passo nasce completo com método, headers e payload.',
    f3_title: 'Massa de Dados CSV & Segredos .env',
    f3_desc:
      'Alimente cada usuário virtual com linhas reais de uma planilha CSV (sequencial ou aleatória) e injete chaves sensíveis via <code>{{env.CHAVE}}</code> sem exibi-las na tela.',
    f4_title: 'Telemetria ao Vivo (p50, p95, p99 & RPS)',
    f4_desc:
      'Acompanhe gráficos suaves em tempo real, janelas configuráveis, cumprimento automático de regras de SLA e captura de amostras reais de erro para diagnóstico rápido.',
    f5_title: 'Comparação Antes vs. Depois',
    f5_desc:
      'Selecione duas execuções salvas no histórico local e compare lado a lado quanto uma otimização reduziu a latência p95 ou aumentou a vazão por segundo.',
    f6_title: 'Confirmação Pré-Voo & SSL Local',
    f6_desc:
      'Janela de revisão antes de disparar carga (protegendo contra disparos acidentais) e suporte simples a certificados HTTPS autoassinados em ambientes locais e internos.',
    ex_eyebrow: '📊 DIFERENCIAL EXCLUSIVO • PONTE ENTRE DEV E NEGÓCIO',
    ex_title: 'O Relatório Executivo que fala a língua de quem decide',
    ex_subtitle:
      'Ao finalizar qualquer bateria, o LoadSmith transforma métricas de engenharia em respostas diretas prontas para compartilhar em PDF, HTML ou resumo executivo nos 3 idiomas.',
    ex_pill_1: 'Pergunta 01',
    ex1_title: 'Aguenta a carga testada?',
    ex1_desc:
      'Converte requisições por segundo em capacidade real de negócio (operações por minuto e por hora), destacando taxa de sucesso e estabilidade sustentada ao longo do teste.',
    ex_pill_2: 'Pergunta 02',
    ex2_title: 'Vai cair na Black Friday?',
    ex2_desc:
      'Com o Simulador de Meta integrado, digite quantas operações/minuto o negócio espera no pico (1k, 5k, 15k, 30k+) e descubra na hora a folga de segurança ou quanto falta escalar.',
    ex_pill_3: 'Pergunta 03',
    ex3_title: 'Como o cliente sente na tela?',
    ex3_desc:
      'Traduz percentis p95 em percepção humana imediata (Instantânea, Rápida, Perceptível ou Lenta) e gera recomendações práticas exportáveis em 1 clique para PDF ou HTML.',
    oss_badge: '💚 100% OPEN SOURCE • LICENÇA MIT',
    oss_title: 'Código aberto para a comunidade — Use, audite e contribua!',
    oss_desc:
      'O LoadSmith é gratuito e 100% código aberto sob licença MIT. Contribua com novos templates, relatórios, protocolos ou abra sugestões diretamente no GitHub.',
    oss_btn_fork: '🍴 Contribuir no GitHub',
    oss_btn_issues: '💡 Sugerir Melhoria / Issue',
    man_eyebrow: '📖 GUIA PASSO A PASSO',
    man_title: 'Manual Prático de Uso',
    man_subtitle: 'Domine todo o fluxo do LoadSmith em menos de 5 minutos.',
    m1_title: 'Instalação Rápida em Windows, macOS ou Linux (Zero Dependências)',
    m1_desc:
      'Baixe o pacote para seu sistema em Releases: Windows (<code>.exe</code> instalador ou portátil), macOS (<code>.dmg</code> / <code>.zip</code> Intel & Apple Silicon) ou Linux (<code>.AppImage</code> / <code>.deb</code>). Na primeira abertura, a pasta <code>Documents/LoadSmith</code> já vem com um cenário de exemplo pronto.',
    m2_title: 'Criando Cenários por Modelo ou Importando um cURL',
    m2_desc:
      'Clique em <strong>+</strong> na coluna de Cenários e escolha entre <em>API REST Simples</em>, <em>Login + Rota Autenticada</em> ou <em>Carga com Massa CSV</em>. Já tem a chamada no Postman, Insomnia ou navegador? Clique em <strong>Importar cURL</strong> no Editor Visual e cole o comando.',
    m3_title: 'Encadeando Variáveis, Planilhas CSV e Segredos .env',
    m3_desc:
      'Use <strong>Extrair</strong> em um passo de login para salvar o token e reutilizá-lo nos próximos passos como <code>{{token}}</code>. Vincule um arquivo <code>.csv</code> para que cada usuário virtual envie dados distintos e guarde senhas ou chaves em um arquivo <code>.env</code> local usando chips <code>{{env.SUA_CHAVE}}</code>.',
    m4_title: 'Primeiro Smoke, Depois Carga com Regras de SLA',
    m4_desc:
      'Comece sempre no modo <strong>Smoke</strong> (um usuário passo a passo, parando imediatamente se algo falhar) para garantir que o fluxo está correto. Em seguida, alterne para <strong>Carga</strong>, defina usuários virtuais (VUs), duração, rampa de subida e limites de aprovação (p95 máximo e taxa de erro).',
    m5_title: 'Lendo a Telemetria ao Vivo e Diagnosticando Erros',
    m5_desc:
      'Durante o teste, acompanhe RPS, latência típica (<code>p50</code>), experiência de 95% dos usuários (<code>p95</code>) e pior caso (<code>p99</code>). Se ocorrerem falhas, abra a aba <strong>Erros</strong> para inspecionar o passo exato, status HTTP retornado e mensagem detalhada.',
    m6_title: 'Comparando Antes vs. Depois e Exportando o Relatório Executivo',
    m6_desc:
      'Toda execução fica salva localmente. Abra <strong>Antes vs. Depois</strong> para comprovar melhorias entre duas versões da sua API, ou clique em <strong>Relatório Executivo</strong> para simular metas de pico e exportar o parecer completo em PDF ou HTML.',
    sib_eyebrow: '🔥 CONHEÇA SEU IRMÃO DE FORJA • ECOSSISTEMA LOCAL',
    sib_title: '<span class="hooksmith-accent">Hooksmith</span> — A Forja Local de APIs & Webhooks',
    sib_desc:
      'O <strong>LoadSmith</strong> e o <strong>Hooksmith</strong> nasceram da mesma filosofia: ferramentas de desktop rápidas, elegantes, 100% offline, em 3 idiomas e livres de nuvem. Enquanto o LoadSmith coloca suas APIs à prova sob carga, o Hooksmith intercepta tráfego, cria mocks HTTP/HTTPS com SSL automático, dispara callbacks assíncronos e faz replay de webhooks em tempo real.',
    sib_p1: '🔒 Listeners HTTP & HTTPS (Auto SSL)',
    sib_p2: '🚀 Callbacks Assíncronos Nativos',
    sib_p3: '✨ Inspector Pretty/Raw & Replay',
    sib_p4: '💚 100% Local & Open Source',
    sib_cta_site: '🌐 Conhecer o Hooksmith',
    sib_cta_repo: '⭐ Hooksmith no GitHub',
    sib_synergy:
      '<strong>Combo Perfeito no Desktop:</strong> Suba mocks HTTPS e callbacks de gateways no <strong>Hooksmith</strong> para desenvolver sua integração, e depois use o <strong>LoadSmith</strong> para validar o fluxo ponta a ponta e medir quanto seu serviço aguenta!',
    sc_eyebrow: '⌨️ PRODUTIVIDADE & PRIVACIDADE',
    sc_title: 'Atalhos de Teclado & Armazenamento 100% Local',
    sc_run: 'Executar cenário selecionado (com confirmação)',
    sc_save: 'Salvar alterações do cenário aberto',
    sc_search: 'Focar na busca global de cenários e erros',
    sc_stop: 'Parar teste em execução ou fechar janela',
    sc_zoom: 'Ajustar zoom da interface',
    sc_reset_zoom: 'Restaurar zoom padrão (100%)',
    storage_note:
      '🔒 <strong>Armazenamento 100% Local & Offline:</strong> Windows: <code>%APPDATA%/LoadSmith</code> • macOS: <code>~/Library/Application Support/LoadSmith</code> • Linux: <code>~/.config/LoadSmith</code>',
    footer_sibling: 'App irmão:',
  },
  en: {
    nav_story: 'The Origin',
    nav_features: 'Capabilities',
    nav_executive: 'Executive Report',
    nav_manual: 'User Manual',
    nav_sibling: '🔥 Hooksmith',
    nav_shortcuts: 'Shortcuts',
    badge_local: '100% Local & Offline',
    badge_privacy: 'Zero Cloud • Protected Secrets',
    badge_dev: 'For Devs, Tech Leads & Managers',
    badge_oss: '💚 100% Open Source (MIT)',
    hero_title: 'The Local <span class="accent">Smoke & Load Forge</span> without the complexity.',
    hero_subtitle:
      'Validate end-to-end API flows, simulate concurrent traffic spikes, compare Before vs. After, and generate plain-language Executive Reports for decision-makers — right on your desktop.',
    cta_download: '⬇️ Download (Win / Mac / Linux)',
    cta_manual: '📖 Read User Manual',
    cta_github: '⭐ View on GitHub',
    car_eyebrow: '📸 REAL APPLICATION SCREENSHOTS',
    car_t1: 'Workspace & Scenarios',
    car_d1:
      '<strong>1. Workspace & Scenarios:</strong> Clean overview with instant Smoke vs. Load toggle, SLA metadata summary, language switcher, and ready-to-copy CLI command.',
    car_t2: 'Visual Editor, .env & CSV',
    car_d2:
      '<strong>2. Visual Scenario Editor:</strong> Build steps without writing code, allow local self-signed SSL certificates, auto-detect <code>.env</code> secrets, and feed data-driven CSV rows.',
    car_t3: 'Real-Time Telemetry',
    car_d3:
      '<strong>3. Live Telemetry:</strong> Watch RPS, p50/p95/p99 latency curves, error rate, active VUs, and automated SLA threshold checks in real time.',
    car_t4: 'Executive Report & Peak',
    car_d4:
      '<strong>4. Executive Report:</strong> Translates engineering numbers into business language with an interactive Target Simulator (e.g., Black Friday) and 1-click PDF/HTML export.',
    sim_hint:
      '💡 Interactive Simulator: Click the Live Stream events or switch between Telemetry, YAML, and the Executive Peak Simulator below!',
    story_eyebrow: '☕ BUILT FOR DEVS & TECH LEADERSHIP',
    story_title: 'Born from the gap between heavy load tools and the Black Friday question',
    story_desc:
      'Every team faces the same tension before a major launch: verifying that multi-step API flows work and proving whether the system will survive peak traffic.',
    pain_title: '❌ The Old Struggle (JMeter, Code Scripts & Cloud SaaS)',
    pain_1:
      '<strong>The JMeter Maze:</strong> Dated 2000s UIs, giant XML files impossible to review in Pull Requests, and heavy memory overhead.',
    pain_2:
      '<strong>The Scripting Barrier (k6 / Gatling):</strong> Writing boilerplate code just to chain Login + Create Order with a CSV spreadsheet before an urgent release.',
    pain_3:
      '<strong>Cloud Credential Risk:</strong> Uploading staging tokens, <code>.env</code> secrets, and internal URLs to third-party SaaS platforms that charge per virtual user.',
    pain_4:
      '<strong>The Management Gap:</strong> Finishing a run full of raw metrics (<code>p95</code>, <code>p99</code>, <code>RPS</code>) only to hear: <em>"Okay, but can it handle 15,000 orders/min or will it crash?"</em>',
    forge_title: '⚡ The LoadSmith Way',
    forge_1:
      '<strong>Visual Editor + Clean Git YAML:</strong> Build scenarios with intuitive forms or import a <code>cURL</code> command in 1 click while keeping human-readable YAML files in Git.',
    forge_2:
      '<strong>Smoke & Load in One Place:</strong> Verify step-by-step correctness with Sequential Smoke, then flip one switch to unleash concurrent Virtual Users.',
    forge_3:
      '<strong>100% Local <code>.env</code> Secrets & CSV Data:</strong> Your API keys stay strictly on your machine and are never exposed on screen or saved inside scenario files.',
    forge_4:
      '<strong>Executive Report + Peak Simulator:</strong> Translate raw latency and throughput into capacity per minute, customer experience, and an exportable PDF/HTML verdict.',
    feat_eyebrow: '🚀 CORE CAPABILITIES',
    feat_title: 'From your first API check to an executive sign-off',
    feat_subtitle:
      'Engineered to combine developer speed, real-time statistical precision, and business clarity inside a single offline desktop app.',
    f1_title: 'Synced Visual & Code Editor',
    f1_desc:
      'Configure steps, headers, JSON payloads, status/latency assertions, and variable extraction (<code>{{token}}</code>) visually, or edit YAML directly with live validation.',
    f2_title: '1-Click cURL Import',
    f2_desc:
      'Copy any request from Chrome DevTools, Postman, or Insomnia as cURL, paste it into LoadSmith, and get a complete step with method, headers, and body.',
    f3_title: 'CSV Data-Driven & .env Secrets',
    f3_desc:
      'Feed each virtual user unique rows from a CSV spreadsheet (round-robin or random) and reference sensitive keys via <code>{{env.KEY}}</code> without exposing values.',
    f4_title: 'Live Telemetry (p50, p95, p99 & RPS)',
    f4_desc:
      'Track smooth real-time multi-percentile charts, configurable measurement windows, automated SLA pass/fail rules, and captured error samples.',
    f5_title: 'Before vs. After Comparison',
    f5_desc:
      'Pick any two historical runs stored locally and see side-by-side how much your optimization lowered p95 latency or boosted throughput.',
    f6_title: 'Pre-Flight Safety Check & Local SSL',
    f6_desc:
      'Confirmation modal before firing load (preventing accidental stress runs on the wrong host) plus native support for local self-signed HTTPS certificates.',
    ex_eyebrow: '📊 SIGNATURE DIFFERENTIATOR • BRIDGING ENGINEERING & BUSINESS',
    ex_title: 'The Executive Report that speaks decision-maker language',
    ex_subtitle:
      'After any run, LoadSmith translates engineering metrics into direct business answers ready to export to PDF, HTML, or plain-text summary in English, Portuguese, or Spanish.',
    ex_pill_1: 'Question 01',
    ex1_title: 'Can it handle the tested load?',
    ex1_desc:
      'Converts requests per second into real business capacity (operations per minute and hour), highlighting reliability rate and sustained stability.',
    ex_pill_2: 'Question 02',
    ex2_title: 'Will it survive Black Friday?',
    ex2_desc:
      'Type expected peak operations/minute into the Target Simulator (1k, 5k, 15k, 30k+) to immediately see safety headroom or capacity shortfall.',
    ex_pill_3: 'Question 03',
    ex3_title: 'How does it feel for customers?',
    ex3_desc:
      'Maps p95 milliseconds into human perception (Instant, Fast, Noticeable, or Slow) with actionable next steps and 1-click PDF/HTML export.',
    oss_badge: '💚 100% OPEN SOURCE • MIT LICENSE',
    oss_title: 'Open source for the community — Use, inspect, and contribute!',
    oss_desc:
      'LoadSmith is free and 100% open source under the MIT license. Contribute scenario templates, new features, or open issues directly on GitHub.',
    oss_btn_fork: '🍴 Contribute on GitHub',
    oss_btn_issues: '💡 Suggest Feature / Issue',
    man_eyebrow: '📖 STEP-BY-STEP GUIDE',
    man_title: 'Practical User Manual',
    man_subtitle: 'Master the entire LoadSmith workflow in under 5 minutes.',
    m1_title: 'Quick Install on Windows, macOS, or Linux (Zero Dependencies)',
    m1_desc:
      'Download the package for your OS from Releases: Windows (<code>.exe</code> installer or portable), macOS (<code>.dmg</code> / <code>.zip</code> Intel & Apple Silicon), or Linux (<code>.AppImage</code> / <code>.deb</code>). On first launch, <code>Documents/LoadSmith</code> is created with a ready-to-run example scenario.',
    m2_title: 'Creating Scenarios from Templates or Importing cURL',
    m2_desc:
      'Click <strong>+</strong> in the Scenarios sidebar and pick <em>Simple REST API</em>, <em>Login + Authenticated Route</em>, or <em>CSV Data-Driven Load</em>. Already have a request in Postman or DevTools? Click <strong>Import cURL</strong> in the Visual Editor.',
    m3_title: 'Chaining Variables, CSV Spreadsheets & .env Secrets',
    m3_desc:
      'Use <strong>Extract</strong> on a login step to capture a token and reuse it downstream as <code>{{token}}</code>. Link a <code>.csv</code> file so every virtual user sends distinct data, and keep API keys safe in a local <code>.env</code> file using <code>{{env.YOUR_KEY}}</code> chips.',
    m4_title: 'Run Smoke First, Then Scale to Load with SLA Rules',
    m4_desc:
      'Always start in <strong>Smoke</strong> mode (single sequential user, stopping at the first failure) to confirm your flow works. Then switch to <strong>Load</strong>, set Virtual Users (VUs), duration, ramp-up, and SLA thresholds (max p95 & error rate).',
    m5_title: 'Reading Live Telemetry & Diagnosing Error Samples',
    m5_desc:
      'During execution, watch RPS, typical latency (<code>p50</code>), 95th-percentile user experience (<code>p95</code>), and tail latency (<code>p99</code>). Open the <strong>Errors</strong> tab to inspect failed steps, HTTP status codes, and messages.',
    m6_title: 'Comparing Before vs. After & Exporting the Executive Report',
    m6_desc:
      'Every run is saved locally. Open <strong>Before vs. After</strong> to prove performance gains across releases, or click <strong>Executive Report</strong> to simulate peak targets and export a polished PDF or HTML report.',
    sib_eyebrow: '🔥 MEET ITS SIBLING APP • LOCAL FORGE ECOSYSTEM',
    sib_title: '<span class="hooksmith-accent">Hooksmith</span> — The Local API & Webhook Forge',
    sib_desc:
      '<strong>LoadSmith</strong> and <strong>Hooksmith</strong> share the exact same DNA: fast, craft-focused desktop tools that work 100% offline, speak 3 languages, and keep your data off the cloud. While LoadSmith stress-tests your APIs under load, Hooksmith intercepts traffic, mocks HTTP/HTTPS endpoints with auto-SSL, triggers automated async callbacks, and replays webhooks in real time.',
    sib_p1: '🔒 HTTP & HTTPS Listeners (Auto SSL)',
    sib_p2: '🚀 Native Async Webhook Callbacks',
    sib_p3: '✨ Pretty/Raw Inspector & Replay',
    sib_p4: '💚 100% Local & Open Source',
    sib_cta_site: '🌐 Explore Hooksmith',
    sib_cta_repo: '⭐ Hooksmith on GitHub',
    sib_synergy:
      '<strong>Ultimate Desktop Power Duo:</strong> Spin up HTTPS mocks and async payment callbacks in <strong>Hooksmith</strong> while building your integration, then point <strong>LoadSmith</strong> at your service to validate end-to-end throughput and SLA headroom!',
    sc_eyebrow: '⌨️ PRODUCTIVITY & PRIVACY',
    sc_title: 'Keyboard Shortcuts & 100% Local Storage',
    sc_run: 'Run selected scenario (opens pre-flight check)',
    sc_save: 'Save changes to the open scenario',
    sc_search: 'Focus global search across scenarios & errors',
    sc_stop: 'Stop active run or close modal window',
    sc_zoom: 'Zoom in / Zoom out application UI',
    sc_reset_zoom: 'Reset UI zoom to default (100%)',
    storage_note:
      '🔒 <strong>100% Local & Offline Storage:</strong> Windows: <code>%APPDATA%/LoadSmith</code> • macOS: <code>~/Library/Application Support/LoadSmith</code> • Linux: <code>~/.config/LoadSmith</code>',
    footer_sibling: 'Sibling app:',
  },
  es: {
    nav_story: 'El Origen',
    nav_features: 'Funcionalidades',
    nav_executive: 'Informe Ejecutivo',
    nav_manual: 'Manual de Uso',
    nav_sibling: '🔥 Hooksmith',
    nav_shortcuts: 'Atajos',
    badge_local: '100% Local y Offline',
    badge_privacy: 'Cero Nube • Secretos Protegidos',
    badge_dev: 'Para Devs, Tech Leads y Gerentes',
    badge_oss: '💚 100% Open Source (MIT)',
    hero_title: 'La Forja Local de <span class="accent">Smoke y Load Tests</span> sin complejidad.',
    hero_subtitle:
      'Valida flujos completos de API, simula picos de carga concurrente, compara Antes vs. Después y genera Informes Ejecutivos claros para la toma de decisiones — directo en tu escritorio.',
    cta_download: '⬇️ Descargar (Win / Mac / Linux)',
    cta_manual: '📖 Leer Manual de Uso',
    cta_github: '⭐ Ver en GitHub',
    car_eyebrow: '📸 INTERFAZ REAL DE LA APLICACIÓN',
    car_t1: 'Workspace y Escenarios',
    car_d1:
      '<strong>1. Workspace y Escenarios:</strong> Vista limpia con cambio rápido entre Smoke y Carga, resumen de SLA, selector de idioma y comando CLI listo para copiar.',
    car_t2: 'Editor Visual, .env y CSV',
    car_d2:
      '<strong>2. Editor Visual de Escenarios:</strong> Configura pasos sin código, acepta certificados SSL autofirmados locales, detecta claves <code>.env</code> automáticamente y usa datos CSV.',
    car_t3: 'Telemetría en Tiempo Real',
    car_d3:
      '<strong>3. Telemetría en Vivo:</strong> Monitorea RPS, latencias p50/p95/p99, tasa de error, VUs activos y cumplimiento automático de SLA en tiempo real.',
    car_t4: 'Informe Ejecutivo y Pico',
    car_d4:
      '<strong>4. Informe Ejecutivo:</strong> Traduce métricas técnicas a lenguaje de negocio con Simulador de Meta (ej. Black Friday) y exportación en PDF o HTML.',
    sim_hint:
      '💡 Simulador Interactivo: ¡Haz clic en los eventos del Live Stream o alterna entre Telemetría, YAML y el Simulador Ejecutivo abajo!',
    story_eyebrow: '☕ DE DEV PARA DEV Y LIDERAZGO',
    story_title: 'Nacido del dolor real entre herramientas pesadas y la pregunta del Black Friday',
    story_desc:
      'Todo equipo vive la misma tensión antes de un lanzamiento crítico: comprobar que el flujo funcione y demostrar si el servidor soportará el pico.',
    pain_title: '❌ El Sufrimiento Antiguo (JMeter, Scripts y SaaS)',
    pain_1:
      '<strong>El Laberinto de JMeter:</strong> Interfaces de los años 2000, archivos XML enormes imposibles de revisar en Pull Requests y alto consumo de memoria.',
    pain_2:
      '<strong>Barrera de Código (k6 / Gatling):</strong> Tener que programar scripts completos solo para encadenar Login + Pedido con datos CSV antes de una entrega urgente.',
    pain_3:
      '<strong>Riesgo de Credenciales en la Nube:</strong> Subir tokens de staging, archivos <code>.env</code> y URLs internas a plataformas SaaS externas cobradas por usuario virtual.',
    pain_4:
      '<strong>La Brecha con Gerencia:</strong> Terminar la prueba llena de siglas (<code>p95</code>, <code>p99</code>, <code>RPS</code>) y escuchar: <em>"¿Pero aguanta 15 mil compras por minuto o se cae?"</em>',
    forge_title: '⚡ El Estilo LoadSmith',
    forge_1:
      '<strong>Editor Visual + YAML Limpio en Git:</strong> Crea escenarios con formularios intuitivos o importa un <code>cURL</code> en 1 clic manteniendo archivos YAML legibles.',
    forge_2:
      '<strong>Smoke y Carga en el Mismo Lugar:</strong> Verifica paso a paso con Smoke Fail-Fast y cambia un interruptor para lanzar decenas o cientos de usuarios virtuales.',
    forge_3:
      '<strong>Secretos <code>.env</code> y CSV 100% Locales:</strong> Tus contraseñas y claves quedan solo en tu equipo y nunca se muestran en pantalla ni se guardan en el escenario.',
    forge_4:
      '<strong>Informe Ejecutivo con Simulador de Pico:</strong> Traduce métricas técnicas en capacidad por minuto, experiencia del cliente y veredicto exportable en PDF o HTML.',
    feat_eyebrow: '🚀 CAPACIDADES PRINCIPALES',
    feat_title: 'Desde la primera ruta probada hasta el veredicto ejecutivo',
    feat_subtitle:
      'Diseñado para unir productividad de desarrollo, precisión estadística en tiempo real y claridad de negocio en una sola app local.',
    f1_title: 'Editor Visual y Código Sincronizados',
    f1_desc:
      'Configura pasos, cabeceras, cuerpo JSON, aserciones y extracción de variables (<code>{{token}}</code>) sin código, o edita el YAML con validación instantánea.',
    f2_title: 'Importación Instantánea de cURL',
    f2_desc:
      'Copia cualquier petición desde Chrome DevTools, Postman o Insomnia como cURL, pégala en LoadSmith y obtén el paso completo al instante.',
    f3_title: 'Datos CSV y Secretos .env',
    f3_desc:
      'Alimenta cada usuario virtual con filas reales de un archivo CSV (secuencial o aleatorio) e inyecta claves sensibles vía <code>{{env.CLAVE}}</code> sin exponerlas.',
    f4_title: 'Telemetría en Vivo (p50, p95, p99 y RPS)',
    f4_desc:
      'Sigue gráficos fluidos en tiempo real, ventanas configurables, validación automática de SLA y muestras detalladas de errores.',
    f5_title: 'Comparación Antes vs. Después',
    f5_desc:
      'Selecciona dos ejecuciones del historial local y compara lado a lado cuánto redujo la latencia p95 o aumentó el rendimiento tu optimización.',
    f6_title: 'Confirmación Previa y SSL Local',
    f6_desc:
      'Ventana de confirmación antes de lanzar carga (evitando accidentes) y soporte sencillo para certificados HTTPS autofirmados en entornos locales.',
    ex_eyebrow: '📊 DIFERENCIAL EXCLUSIVO • PUENTE ENTRE INGENIERÍA Y NEGOCIO',
    ex_title: 'El Informe Ejecutivo que habla el idioma de quienes deciden',
    ex_subtitle:
      'Al terminar cualquier prueba, LoadSmith transforma métricas técnicas en respuestas directas listas para exportar en PDF, HTML o resumen en 3 idiomas.',
    ex_pill_1: 'Pregunta 01',
    ex1_title: '¿Soporta la carga probada?',
    ex1_desc:
      'Convierte peticiones por segundo en capacidad real de negocio (operaciones por minuto y hora), destacando confiabilidad y estabilidad sostenida.',
    ex_pill_2: 'Pregunta 02',
    ex2_title: '¿Se caerá en el Black Friday?',
    ex2_desc:
      'Ingresa las operaciones/minuto esperadas en el Simulador de Meta (1k, 5k, 15k, 30k+) y descubre al instante el margen de seguridad o cuánto falta escalar.',
    ex_pill_3: 'Pregunta 03',
    ex3_title: '¿Cómo lo siente el cliente en pantalla?',
    ex3_desc:
      'Traduce milisegundos p95 en percepción humana (Instantánea, Rápida, Perceptible o Lenta) con recomendaciones y exportación en 1 clic a PDF o HTML.',
    oss_badge: '💚 100% OPEN SOURCE • LICENCIA MIT',
    oss_title: 'Código abierto para la comunidad — ¡Usa, audita y contribuye!',
    oss_desc:
      'LoadSmith es gratuito y 100% código abierto bajo licencia MIT. Contribuye con plantillas, mejoras o sugerencias directamente en GitHub.',
    oss_btn_fork: '🍴 Contribuir en GitHub',
    oss_btn_issues: '💡 Sugerir Mejora / Issue',
    man_eyebrow: '📖 GUÍA PASO A PASO',
    man_title: 'Manual Práctico de Uso',
    man_subtitle: 'Domina todo el flujo de LoadSmith en menos de 5 minutos.',
    m1_title: 'Instalación Rápida en Windows, macOS o Linux (Cero Dependencias)',
    m1_desc:
      'Descarga el paquete para tu sistema en Releases: Windows (<code>.exe</code> instalador o portátil), macOS (<code>.dmg</code> / <code>.zip</code> Intel y Apple Silicon) o Linux (<code>.AppImage</code> / <code>.deb</code>). En el primer inicio se crea <code>Documents/LoadSmith</code> con un escenario listo.',
    m2_title: 'Crear Escenarios desde Plantillas o Importar cURL',
    m2_desc:
      'Haz clic en <strong>+</strong> en Escenarios y elige <em>API REST Simple</em>, <em>Login + Ruta Autenticada</em> o <em>Carga con Datos CSV</em>. ¿Ya tienes la llamada en Postman o DevTools? Usa <strong>Importar cURL</strong>.',
    m3_title: 'Encadenar Variables, Archivos CSV y Secretos .env',
    m3_desc:
      'Usa <strong>Extraer</strong> en el login para guardar el token y reutilizarlo como <code>{{token}}</code>. Vincula un archivo <code>.csv</code> para variar los datos por usuario y protege claves en <code>.env</code> usando <code>{{env.TU_CLAVE}}</code>.',
    m4_title: 'Primero Smoke, Luego Carga con Reglas SLA',
    m4_desc:
      'Comienza siempre en modo <strong>Smoke</strong> (un usuario paso a paso que se detiene al primer fallo). Luego cambia a <strong>Carga</strong>, define usuarios virtuales (VUs), duración, rampa y límites SLA.',
    m5_title: 'Lectura de Telemetría en Vivo y Diagnóstico de Errores',
    m5_desc:
      'Observa RPS, latencia típica (<code>p50</code>), experiencia del 95% (<code>p95</code>) y peor caso (<code>p99</code>). Revisa la pestaña <strong>Errores</strong> para ver el paso exacto, estado HTTP y mensaje.',
    m6_title: 'Comparar Antes vs. Después y Exportar el Informe Ejecutivo',
    m6_desc:
      'Cada ejecución se guarda localmente. Abre <strong>Antes vs. Después</strong> para demostrar mejoras entre versiones o haz clic en <strong>Informe Ejecutivo</strong> para simular picos y exportar en PDF o HTML.',
    sib_eyebrow: '🔥 CONOCE A SU APP HERMANA • ECOSISTEMA FORGE LOCAL',
    sib_title: '<span class="hooksmith-accent">Hooksmith</span> — La Forja Local de APIs y Webhooks',
    sib_desc:
      '<strong>LoadSmith</strong> y <strong>Hooksmith</strong> comparten la misma filosofía: aplicaciones de escritorio rápidas, elegantes, 100% offline, en 3 idiomas y sin nube. Mientras LoadSmith pone a prueba tus APIs bajo carga, Hooksmith intercepta tráfico, simula mocks HTTP/HTTPS con SSL automático, dispara callbacks asíncronos y repite webhooks en tiempo real.',
    sib_p1: '🔒 Listeners HTTP y HTTPS (Auto SSL)',
    sib_p2: '🚀 Callbacks Asíncronos Nativos',
    sib_p3: '✨ Inspector Pretty/Raw y Replay',
    sib_p4: '💚 100% Local y Open Source',
    sib_cta_site: '🌐 Conocer Hooksmith',
    sib_cta_repo: '⭐ Hooksmith en GitHub',
    sib_synergy:
      '<strong>Dúo Perfecto en tu Escritorio:</strong> Levanta mocks HTTPS y callbacks asíncronos en <strong>Hooksmith</strong> mientras desarrollas tu integración, ¡y luego usa <strong>LoadSmith</strong> para validar el flujo completo y medir cuánto soporta tu servicio!',
    sc_eyebrow: '⌨️ PRODUCTIVIDAD Y PRIVACIDAD',
    sc_title: 'Atajos de Teclado y Almacenamiento 100% Local',
    sc_run: 'Ejecutar escenario seleccionado (con confirmación)',
    sc_save: 'Guardar cambios del escenario abierto',
    sc_search: 'Enfocar búsqueda global de escenarios y errores',
    sc_stop: 'Detener prueba activa o cerrar ventana',
    sc_zoom: 'Ajustar zoom de la interfaz',
    sc_reset_zoom: 'Restaurar zoom predeterminado (100%)',
    storage_note:
      '🔒 <strong>Almacenamiento 100% Local y Offline:</strong> Windows: <code>%APPDATA%/LoadSmith</code> • macOS: <code>~/Library/Application Support/LoadSmith</code> • Linux: <code>~/.config/LoadSmith</code>',
    footer_sibling: 'App hermana:',
  },
};

const SIM_SCENARIOS = {
  orders: {
    name: 'E-Commerce Orders Flow (CSV Data-Driven)',
    file: 'api-flow-csv.yaml',
    rps: '311.9',
    p50: '19.0 ms',
    p95: '44.2 ms',
    p99: '67.7 ms',
    errRate: '0.00%',
    reqs: '3,320',
    vus: '25 VUs',
    elapsed: '12.0s',
    capacityPerMin: 17660,
    yaml: `name: E-Commerce Orders Flow (CSV Data-Driven)
baseUrl: http://127.0.0.1:8090
envFile: .env
csvData:
  file: ./users.csv
  mode: round-robin
load:
  vus: 25
  duration: 12s
  rampUp: 3s
thresholds:
  p95Ms: 250
  errorRatePct: 1
steps:
  - name: Authenticate User
    method: POST
    path: /auth/login
    headers:
      X-Api-Key: "{{env.API_TOKEN}}"
    body: '{"email":"{{email}}"}'
    extract:
      token: token
  - name: Create Order
    method: POST
    path: /orders
    headers:
      Authorization: "Bearer {{token}}"
    body: '{"sku":"{{sku}}","qty":1}'
    expectStatus: 201`,
  },
  smoke: {
    name: 'Auth + Checkout Smoke',
    file: 'smoke-auth.yaml',
    rps: '14.2',
    p50: '11.4 ms',
    p95: '18.6 ms',
    p99: '21.0 ms',
    errRate: '0.00%',
    reqs: '3',
    vus: '1 VU (Smoke)',
    elapsed: '0.2s',
    capacityPerMin: 852,
    yaml: `name: Auth + Checkout Sequential Smoke
baseUrl: https://staging.api.local:8443
insecureSkipVerify: true
envFile: .env
steps:
  - name: Health Check
    method: GET
    path: /health
    expectStatus: 200
  - name: Login Session
    method: POST
    path: /auth/token
    body: '{"client":"smoke","secret":"{{env.CLIENT_SECRET}}"}'
    extract:
      jwt: access_token
  - name: Validate Cart Checkout
    method: POST
    path: /checkout/preview
    headers:
      Authorization: "Bearer {{jwt}}"
    expectStatus: 200`,
  },
};

let currentLang = 'pt';
let currentScenarioKey = 'orders';
let currentSimTab = 'telemetry'; // 'telemetry' | 'yaml' | 'executive'
let currentSimItem = 'tick1';
let targetPeakPerMin = 15000;

function detectLocalLanguage() {
  try {
    const intlLocale =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().locale : '';
    const navList = Array.isArray(navigator.languages) ? navigator.languages : [];
    const candidates = [...navList, navigator.language, intlLocale];
    for (const raw of candidates) {
      const code = (raw || '').trim().toLowerCase();
      if (!code) continue;
      if (code.startsWith('pt')) return 'pt';
      if (code.startsWith('es')) return 'es';
      if (code.startsWith('en')) return 'en';
    }
  } catch {}
  return 'en';
}

function setLanguage(lang, persist = true) {
  if (!I18N[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US';

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (I18N[lang][key]) {
      el.innerHTML = I18N[lang][key];
    }
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  renderSimulatorInspector();

  if (persist) {
    try {
      localStorage.setItem('loadsmith:docs-lang', lang);
    } catch {}
  }
}

function selectScenario(key) {
  if (!SIM_SCENARIOS[key]) return;
  currentScenarioKey = key;
  document.querySelectorAll('[data-sim-scen]').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-sim-scen') === key);
  });
  renderSimulatorInspector();
}

function selectSimItem(itemKey) {
  currentSimItem = itemKey;
  document.querySelectorAll('[data-sim-item]').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-sim-item') === itemKey);
  });
  if (itemKey === 'exec1') {
    currentSimTab = 'executive';
  } else if (itemKey === 'step1') {
    currentSimTab = 'yaml';
  } else {
    currentSimTab = 'telemetry';
  }
  renderSimulatorInspector();
}

function setSimTab(tab) {
  currentSimTab = tab;
  renderSimulatorInspector();
}

function setPeakTarget(val) {
  targetPeakPerMin = val;
  renderSimulatorInspector();
}

function renderSimulatorInspector() {
  const container = document.getElementById('sim-inspector');
  const scen = SIM_SCENARIOS[currentScenarioKey];
  if (!container || !scen) return;

  const labels = {
    pt: {
      tabTel: '📈 Telemetria',
      tabYaml: '📝 YAML / .env',
      tabExec: '📊 Relatório Executivo',
      slaPassed: '✓ Limites de SLA aprovados',
      rps: 'RPS Atual',
      p95: 'Latência p95',
      err: 'Taxa de Erro',
      reqs: 'Total Requisições',
      peakTitle: '🎯 Simulador de Meta (ex.: Black Friday):',
      capMeasured: 'Capacidade Medida',
      uxLabel: 'Experiência na Tela',
      uxValue: 'Instantânea',
      approved: 'APROVADO',
      attention: 'ATENÇÃO',
      risk: 'RISCO ALTO',
      headroomOk: (cap, tgt, margin) =>
        `Atinge a meta com segurança (+${margin}% de folga): entregou ${cap.toLocaleString()}/min frente a ${tgt.toLocaleString()}/min esperados.`,
      headroomTight: (cap, tgt, margin) =>
        `Atinge a meta, mas no limite (+${margin}% de margem): entregou ${cap.toLocaleString()}/min vs. ${tgt.toLocaleString()}/min. Recomenda-se ≥ 20% de folga para picos.`,
      headroomFail: (cap, tgt) =>
        `Abaixo da meta esperada: entregou ${cap.toLocaleString()}/min, mas o pico exige ${tgt.toLocaleString()}/min. Escale instâncias ou otimize gargalos antes do lançamento.`,
    },
    en: {
      tabTel: '📈 Telemetry',
      tabYaml: '📝 YAML / .env',
      tabExec: '📊 Executive Report',
      slaPassed: '✓ Thresholds passed',
      rps: 'Current RPS',
      p95: 'p95 Latency',
      err: 'Error Rate',
      reqs: 'Total Requests',
      peakTitle: '🎯 Target Peak Simulator (e.g., Black Friday):',
      capMeasured: 'Measured Capacity',
      uxLabel: 'Customer Experience',
      uxValue: 'Instant',
      approved: 'APPROVED',
      attention: 'ATTENTION',
      risk: 'HIGH RISK',
      headroomOk: (cap, tgt, margin) =>
        `Meets target with safe headroom (+${margin}% margin): delivered ${cap.toLocaleString()}/min vs. ${tgt.toLocaleString()}/min expected.`,
      headroomTight: (cap, tgt, margin) =>
        `Meets target, but tight (+${margin}% margin): delivered ${cap.toLocaleString()}/min vs. ${tgt.toLocaleString()}/min. At least 20% headroom is recommended.`,
      headroomFail: (cap, tgt) =>
        `Below expected peak volume: delivered ${cap.toLocaleString()}/min, while target requires ${tgt.toLocaleString()}/min. Scale capacity before launch.`,
    },
    es: {
      tabTel: '📈 Telemetría',
      tabYaml: '📝 YAML / .env',
      tabExec: '📊 Informe Ejecutivo',
      slaPassed: '✓ Límites SLA aprobados',
      rps: 'RPS Actual',
      p95: 'Latencia p95',
      err: 'Tasa de Error',
      reqs: 'Total Peticiones',
      peakTitle: '🎯 Simulador de Meta (ej. Black Friday):',
      capMeasured: 'Capacidad Medida',
      uxLabel: 'Experiencia del Cliente',
      uxValue: 'Instantánea',
      approved: 'APROBADO',
      attention: 'ATENCIÓN',
      risk: 'RIESGO ALTO',
      headroomOk: (cap, tgt, margin) =>
        `Supera la meta con holgura (+${margin}% de margen): entregó ${cap.toLocaleString()}/min frente a ${tgt.toLocaleString()}/min esperados.`,
      headroomTight: (cap, tgt, margin) =>
        `Cumple la meta, pero ajustado (+${margin}% de margen): entregó ${cap.toLocaleString()}/min vs. ${tgt.toLocaleString()}/min. Se recomienda ≥ 20% de holgura.`,
      headroomFail: (cap, tgt) =>
        `Por debajo de la meta: entregó ${cap.toLocaleString()}/min, pero el pico exige ${tgt.toLocaleString()}/min. Escala recursos antes del lanzamiento.`,
    },
  }[currentLang];

  const topBar = `
    <div class="inspector-bar">
      <div class="sim-tab-group">
        <button type="button" class="sim-tab-btn ${currentSimTab === 'telemetry' ? 'active' : ''}" onclick="setSimTab('telemetry')">${labels.tabTel}</button>
        <button type="button" class="sim-tab-btn ${currentSimTab === 'yaml' ? 'active' : ''}" onclick="setSimTab('yaml')">${labels.tabYaml}</button>
        <button type="button" class="sim-tab-btn ${currentSimTab === 'executive' ? 'active' : ''}" onclick="setSimTab('executive')">${labels.tabExec}</button>
      </div>
      <span class="sla-tag">${scen.file}</span>
    </div>
  `;

  if (currentSimTab === 'yaml') {
    container.innerHTML = `
      ${topBar}
      <div class="inspector-bar" style="background:#0D131E;">
        <span style="color:#38BDF8;font-family:var(--font-mono);font-weight:700;font-size:0.73rem;">✨ SYNCED SCENARIO DEFINITION</span>
        <span class="sla-tag">✓ Valid syntax</span>
      </div>
      <pre class="code-box">${scen.yaml}</pre>
    `;
    return;
  }

  if (currentSimTab === 'executive') {
    const cap = scen.capacityPerMin;
    const margin = Math.round(((cap - targetPeakPerMin) / targetPeakPerMin) * 100);
    let badgeClass = 'sla-tag';
    let badgeText = labels.approved;
    let verdictCopy = labels.headroomOk(cap, targetPeakPerMin, margin);

    if (cap < targetPeakPerMin) {
      badgeClass = 'err-tag';
      badgeText = labels.risk;
      verdictCopy = labels.headroomFail(cap, targetPeakPerMin);
    } else if (margin < 20) {
      badgeClass = 'warn-tag';
      badgeText = labels.attention;
      verdictCopy = labels.headroomTight(cap, targetPeakPerMin, margin);
    }

    container.innerHTML = `
      ${topBar}
      <div style="padding:16px;display:flex;flex-direction:column;gap:14px;">
        <div style="background:var(--bg-elevated);border:1px solid var(--line-focus);border-radius:10px;padding:13px 15px;">
          <div style="font-size:0.78rem;font-weight:700;color:var(--fg);margin-bottom:9px;">${labels.peakTitle}</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
            <button type="button" class="peak-preset-btn ${targetPeakPerMin === 1000 ? 'active' : ''}" onclick="setPeakTarget(1000)">1k/min</button>
            <button type="button" class="peak-preset-btn ${targetPeakPerMin === 5000 ? 'active' : ''}" onclick="setPeakTarget(5000)">5k/min</button>
            <button type="button" class="peak-preset-btn ${targetPeakPerMin === 15000 ? 'active' : ''}" onclick="setPeakTarget(15000)">15k/min</button>
            <button type="button" class="peak-preset-btn ${targetPeakPerMin === 30000 ? 'active' : ''}" onclick="setPeakTarget(30000)">30k/min</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
          <div class="sim-kpi-card">
            <div class="sim-kpi-label">${labels.capMeasured}</div>
            <div class="sim-kpi-val" style="color:#38BDF8;">${cap.toLocaleString()}/min</div>
            <div class="sim-kpi-sub">${scen.vus} · ${scen.reqs} reqs</div>
          </div>
          <div class="sim-kpi-card">
            <div class="sim-kpi-label">${labels.uxLabel}</div>
            <div class="sim-kpi-val" style="color:#A78BFA;">${labels.uxValue}</div>
            <div class="sim-kpi-sub">95% ≤ ${scen.p95}</div>
          </div>
        </div>

        <div style="background:#0F1724;border:1px solid var(--line-focus);border-radius:10px;padding:14px 16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;">
            <strong style="font-size:0.84rem;color:var(--fg);">Black Friday / Peak Verdict</strong>
            <span class="${badgeClass}">${badgeText}</span>
          </div>
          <p style="font-size:0.82rem;color:var(--fg-muted);line-height:1.5;">${verdictCopy}</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    ${topBar}
    <div class="sim-kpi-grid">
      <div class="sim-kpi-card">
        <div class="sim-kpi-label">${labels.rps}</div>
        <div class="sim-kpi-val" style="color:#38BDF8;">${scen.rps}</div>
        <div class="sim-kpi-sub">${scen.vus}</div>
      </div>
      <div class="sim-kpi-card">
        <div class="sim-kpi-label">${labels.p95}</div>
        <div class="sim-kpi-val" style="color:#A78BFA;">${scen.p95}</div>
        <div class="sim-kpi-sub">p50 ${scen.p50}</div>
      </div>
      <div class="sim-kpi-card">
        <div class="sim-kpi-label">${labels.err}</div>
        <div class="sim-kpi-val" style="color:#34D399;">${scen.errRate}</div>
        <div class="sim-kpi-sub">0 errors</div>
      </div>
      <div class="sim-kpi-card">
        <div class="sim-kpi-label">${labels.reqs}</div>
        <div class="sim-kpi-val" style="color:var(--fg);">${scen.reqs}</div>
        <div class="sim-kpi-sub">Elapsed ${scen.elapsed}</div>
      </div>
    </div>

    <div style="margin:0 14px 12px;padding:8px 12px;border-radius:8px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:0.78rem;font-weight:700;color:#6EE7B7;">${labels.slaPassed}</span>
      <button type="button" class="pretty-btn" style="background:var(--brand-gradient);color:#041318;border:none;padding:4px 10px;border-radius:6px;font-weight:700;font-size:0.72rem;cursor:pointer;" onclick="setSimTab('executive')">${labels.tabExec} ➔</button>
    </div>

    <div style="margin:0 14px 14px;background:#090E16;border:1px solid var(--line);border-radius:10px;padding:12px 14px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="display:flex;justify-content:space-between;align-items:center;font-family:var(--font-mono);font-size:0.7rem;color:var(--fg-muted);margin-bottom:8px;">
        <span>LATENCY (MS) & THROUGHPUT (RPS)</span>
        <div style="display:flex;gap:10px;">
          <span style="color:#34D399;">● p50</span>
          <span style="color:#A78BFA;">● p95</span>
          <span style="color:#F59E0B;">● p99</span>
          <span style="color:#38BDF8;">● RPS</span>
        </div>
      </div>
      <svg viewBox="0 0 520 145" style="width:100%;height:145px;display:block;">
        <defs>
          <linearGradient id="rpsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0EA5E9" stop-opacity="0.24" />
            <stop offset="100%" stop-color="#0EA5E9" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="35" x2="520" y2="35" stroke="#1E2838" stroke-dasharray="3 3" />
        <line x1="0" y1="75" x2="520" y2="75" stroke="#1E2838" stroke-dasharray="3 3" />
        <line x1="0" y1="115" x2="520" y2="115" stroke="#1E2838" stroke-dasharray="3 3" />
        <path d="M0,95 L65,58 L130,44 L195,48 L260,38 L325,42 L390,36 L455,34 L520,39 L520,140 L0,140 Z" fill="url(#rpsFill)" />
        <polyline fill="none" stroke="#38BDF8" stroke-width="2.4" points="0,95 65,58 130,44 195,48 260,38 325,42 390,36 455,34 520,39" />
        <polyline fill="none" stroke="#F59E0B" stroke-width="1.8" points="0,52 65,45 130,50 195,36 260,42 325,33 390,46 455,38 520,35" />
        <polyline fill="none" stroke="#A78BFA" stroke-width="2.1" points="0,84 65,76 130,79 195,70 260,77 325,69 390,74 455,78 520,72" />
        <polyline fill="none" stroke="#34D399" stroke-width="2" points="0,114 65,112 130,109 195,111 260,113 325,108 390,112 455,113 520,110" />
      </svg>
      <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.69rem;color:var(--fg-subtle);margin-top:6px;">
        <span>t=${scen.elapsed} · RPS: ${scen.rps} · p50: ${scen.p50} · p95: ${scen.p95} · p99: ${scen.p99}</span>
        <span>LAST TICK</span>
      </div>
    </div>
  `;
}

let currentSlideIndex = 0;
let carouselTimer = null;
const SLIDE_CAPTION_KEYS = ['car_d1', 'car_d2', 'car_d3', 'car_d4'];

function goToSlide(index) {
  currentSlideIndex = (index + 4) % 4;
  document.querySelectorAll('[data-slide]').forEach((el) => {
    el.classList.toggle('active', Number(el.getAttribute('data-slide')) === currentSlideIndex);
  });
  document.querySelectorAll('[data-slide-tab]').forEach((el) => {
    el.classList.toggle('active', Number(el.getAttribute('data-slide-tab')) === currentSlideIndex);
  });
  document.querySelectorAll('[data-slide-dot]').forEach((el) => {
    el.classList.toggle('active', Number(el.getAttribute('data-slide-dot')) === currentSlideIndex);
  });
  const captionEl = document.getElementById('carousel-caption');
  const key = SLIDE_CAPTION_KEYS[currentSlideIndex];
  if (captionEl && I18N[currentLang] && I18N[currentLang][key]) {
    captionEl.setAttribute('data-i18n', key);
    captionEl.innerHTML = I18N[currentLang][key];
  }
}

function nextSlide() {
  goToSlide(currentSlideIndex + 1);
}

function prevSlide() {
  goToSlide(currentSlideIndex - 1);
}

function startCarouselAutoPlay() {
  stopCarouselAutoPlay();
  carouselTimer = setInterval(() => {
    nextSlide();
  }, 6000);
}

function stopCarouselAutoPlay() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }
}

function pauseCarousel() {
  stopCarouselAutoPlay();
}

function resumeCarousel() {
  startCarouselAutoPlay();
}

function openLightbox(src) {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  if (modal && img) {
    img.src = src;
    modal.classList.add('open');
  }
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (modal) {
    modal.classList.remove('open');
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

function initDocsSite() {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  let savedLang = null;
  try {
    savedLang = localStorage.getItem('loadsmith:docs-lang');
  } catch {}

  if (urlLang && I18N[urlLang]) {
    setLanguage(urlLang, true);
  } else if (savedLang && I18N[savedLang]) {
    setLanguage(savedLang, false);
  } else {
    setLanguage(detectLocalLanguage(), false);
  }

  startCarouselAutoPlay();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDocsSite);
} else {
  initDocsSite();
}
