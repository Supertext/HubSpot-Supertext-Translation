import type { Messages } from './en.js';

// Italian, formal address (Lei), with the terms of HubSpot's Italian interface
// (pagine del sito web, landing page, post del blog, e-mail di marketing,
// knowledge base, bozza, pubblicato, variante linguistica, token di personalizzazione).
export const it: Messages = {
  'nav.translate': 'Traduci',
  'nav.settings': 'Impostazioni',
  'nav.language': 'Lingua',

  'apiKeyHelp.text':
    'Non ha ancora un account Supertext? {signup}. Generi la Sua chiave API in {apiKey} (richiede il ruolo Admin).',
  'apiKeyHelp.signup': 'Ne crei uno su supertext.com',
  'apiKeyHelp.apiKey': 'supertext.com → Integrations → API',

  'connect.heading': 'Supertext Translation per HubSpot',
  'connect.intro':
    'Traduca con Supertext AI le Sue pagine del sito web, landing page, post del blog, e-mail di marketing e articoli della knowledge base di HubSpot. Ogni lingua riceve in HubSpot la propria versione, come bozza da controllare.',
  'connect.point1': 'Scelga una pagina, un post, un’e-mail o un articolo e le lingue.',
  'connect.point2':
    'Testi, titoli e meta descrizioni vengono tradotti; layout, immagini, link e token di personalizzazione restano invariati.',
  'connect.point3': 'Controlli le bozze in HubSpot e le pubblichi come di consueto.',
  'connect.button': 'Collega HubSpot',
  'connect.hint':
    'Accede con HubSpot e autorizza Supertext a leggere i Suoi contenuti e a crearne versioni linguistiche. La knowledge base viene offerta se il Suo account la include.',
  'connect.denied': 'L’accesso a HubSpot non è stato concesso. Si colleghi di nuovo per usare l’app.',
  'connect.disconnected': 'HubSpot è scollegato. Le Sue impostazioni sono state rimosse.',

  'kind.site-page': 'Pagine del sito web',
  'kind.landing-page': 'Landing page',
  'kind.blog-post': 'Post del blog',
  'kind.email': 'E-mail di marketing',
  'kind.kb-article': 'Knowledge base',

  'translate.heading': 'Traduci con Supertext',
  'translate.intro':
    'Crei una versione linguistica di una pagina, di un post, di un’e-mail o di un articolo. Le versioni compaiono in HubSpot come bozze, collegate all’originale dove HubSpot supporta le varianti linguistiche.',
  'translate.noKey.heading': 'Aggiunga la Sua chiave API Supertext',
  'translate.noKey.text': 'L’app ha bisogno di una chiave API Supertext per tradurre. La inserisca in {settings}.',
  'translate.noKey.settings': 'Impostazioni',
  'translate.noLanguages.heading': 'Scelga le Sue lingue',
  'translate.noLanguages.text': 'Scelga in {settings} le lingue in cui tradurre.',
  'translate.step1': '1. Scelga cosa tradurre',
  'translate.name': 'Nome',
  'translate.language': 'Lingua',
  'translate.empty': 'Qui non c’è ancora niente. Lo crei in HubSpot, poi torni qui.',
  'translate.kbMissing':
    'La knowledge base non è collegata: richiede Service Hub Professional o Enterprise e l’accesso dell’app alla knowledge base quando ha collegato HubSpot. Colleghi di nuovo HubSpot per concederlo.',
  'translate.nextPage': 'Pagina successiva',
  'translate.firstPage': 'Prima pagina',
  'translate.step2': '2. Scelga le lingue',
  'translate.notMapped': 'Ancora nessun codice Supertext (vedi Impostazioni)',
  'translate.from': 'Traduzione dalla lingua impostata per il contenuto in HubSpot, altrimenti da: {language}.',
  'translate.fromAuto': 'Traduzione dalla lingua impostata per il contenuto in HubSpot, altrimenti Supertext la riconosce.',
  'translate.overwrite': 'Aggiorna le versioni esistenti',
  'translate.overwriteHint': 'Senza questa opzione, le lingue che hanno già una versione restano invariate.',
  'translate.overwriteWarning':
    'Le bozze delle versioni esistenti verranno sostituite, comprese le modifiche fatte a mano in HubSpot. Le loro pagine pubblicate restano finché non pubblica le nuove bozze.',
  'translate.submit': 'Traduci con Supertext',
  'translate.submitCount.one': 'Traduci in {count} lingua con Supertext',
  'translate.submitCount.other': 'Traduci in {count} lingue con Supertext',
  'translate.selectSomething': 'Selezioni un contenuto e almeno una lingua.',
  'translate.starting': 'Avvio…',

  'state.draft': 'Bozza',
  'state.published': 'Pubblicato',
  'state.scheduled': 'Programmato',
  'state.other': 'Altro',

  'version.none': 'Non tradotto',
  'version.exists': 'Tradotto',

  'job.heading': 'Traduzione',
  'job.running': 'Traduzione di «{item}»… {completed} di {total}',
  'job.done': 'Fatto: {created} create, {updated} aggiornate, {kept} mantenute, {failed} non riuscite.',
  'job.failed': 'La traduzione si è interrotta: {reason}',
  'job.created': 'Nuova versione (bozza)',
  'job.updated': 'Bozza aggiornata',
  'job.kept': 'Versione esistente, mantenuta',
  'job.open': 'Apri in HubSpot',
  'job.review': 'Controlli le bozze in HubSpot e le pubblichi quando sono pronte.',
  'history.heading': 'Traduzioni recenti',
  'history.empty': 'Ancora nessuna traduzione.',

  'settings.heading': 'Impostazioni Supertext',
  'settings.saved': 'Impostazioni salvate.',
  'settings.invalidCodes':
    'Salvato, tranne questi codici, che non sono codici Supertext (ne scelga uno dall’elenco, per esempio de-CH o es): {codes}.',
  'settings.apiKey.heading': 'Chiave API Supertext',
  'settings.apiKey.label': 'Chiave API',
  'settings.apiKey.placeholder': 'Incolli la Sua chiave API Supertext',
  'settings.apiKey.placeholderSaved': 'È salvata una chiave (cifrata). Ne inserisca una nuova per sostituirla.',
  'settings.apiKey.server': 'Ancora nessuna chiave propria: l’app usa la chiave impostata sul server.',
  'settings.apiKey.remove': 'Rimuovi la chiave salvata',
  'settings.test': 'Verifica connessione',
  'settings.testing': 'Verifica in corso…',
  'settings.languages.heading': 'Lingue',
  'settings.languages.text':
    'HubSpot assegna una lingua a ogni pagina, post, e-mail e articolo. Ogni traduzione diventa una versione nella lingua di destinazione; per pagine, landing page e post del blog HubSpot la collega all’originale (gruppo multilingue).',
  'settings.languages.source': 'Lingua dei Suoi contenuti',
  'settings.languages.sourceHint':
    'Usata per i contenuti senza lingua impostata in HubSpot. I contenuti che ne hanno una vengono tradotti dalla propria lingua.',
  'settings.languages.auto': 'Lasciare che Supertext la riconosca',
  'settings.languages.targets': 'Traduci in',
  'settings.languages.code': 'Codice Supertext',
  'settings.languages.codeHint':
    'Inserisca per ogni lingua di destinazione il codice usato da Supertext, per esempio de-CH per il tedesco (Svizzera), en-US per l’inglese (Stati Uniti) o zh-Hans per il cinese semplificato. Una lingua il cui codice HubSpot è già un codice Supertext (de-ch, es, nl) non ne ha bisogno. Una lingua senza codice non viene tradotta.',
  'settings.languages.sent': 'Inviato a Supertext',
  'settings.languages.notMapped': 'Non impostato',
  'settings.languages.unmapped':
    'Queste lingue non hanno ancora un codice Supertext e vengono tradotte solo dopo che ne avrà inserito uno in Lingue: {languages}.',
  'settings.languages.sourceUnsupported':
    'Supertext non conosce {language} come lingua dei Suoi contenuti. Inserisca il suo codice Supertext in Lingue (per esempio en-US per l’inglese) oppure lasci che Supertext la riconosca.',
  'settings.languages.blogHint':
    'Post del blog: una versione linguistica va nel blog di quella lingua, quindi imposti prima in HubSpot una variante linguistica del blog (Impostazioni → Contenuti → Blog).',
  'settings.style.heading': 'Traduzione',
  'settings.style.label': 'Forma di cortesia',
  'settings.style.default': 'Lasciare decidere a Supertext',
  'settings.style.more': 'Formale (p. es. «Lei»)',
  'settings.style.less': 'Informale (p. es. «tu»)',
  'settings.style.notOffered':
    'Supertext non offre una forma di cortesia formale o informale per {languages}; queste lingue vengono tradotte con l’impostazione predefinita di Supertext.',
  'settings.keyCheck.label': 'Verifica della chiave API:',
  'settings.keyCheck.at': '(ultima verifica {time} UTC)',
  'settings.reports.heading': 'Assistenza Supertext',
  'settings.reports.label': 'Inviare le informazioni sulla versione a Supertext',
  'settings.reports.help':
    'Invia a Supertext l’ID del Suo account HubSpot e le versioni di questa app e dell’ambiente di esecuzione quando salva queste impostazioni e dopo un aggiornamento. In questo modo l’assistenza Supertext vede quale versione utilizza. Non vengono trasmessi contenuti, chiavi API né dati personali.',
  'settings.reports.fixed': 'Impostato sul server per tutti gli account (SUPERTEXT_VERSION_REPORTS).',
  'settings.save': 'Salva',
  'settings.connection.heading': 'HubSpot',
  'settings.connection.account': 'Collegato all’account HubSpot {account}.',
  'settings.connection.kb': 'Knowledge base: collegata.',
  'settings.connection.noKb': 'Knowledge base: non collegata (richiede Service Hub Professional o Enterprise).',
  'settings.connection.disconnect': 'Scollega HubSpot',
  'settings.connection.disconnectHint':
    'Rimuove le Sue impostazioni e i token salvati. Le versioni linguistiche già create restano in HubSpot. Per rimuovere l’app anche da HubSpot, la disinstalli in HubSpot in Impostazioni → Integrazioni → App collegate.',
  'settings.connection.confirm': 'Scollegare HubSpot da Supertext? Le Sue impostazioni verranno rimosse.',
  'settings.about.heading': 'Informazioni',
  'settings.about.version': 'Supertext Translation per HubSpot, versione {version}',

  'error.noApiKey':
    'Nessuna chiave API Supertext configurata. La aggiunga nelle impostazioni. Non ha ancora un account Supertext? Ne crei uno su https://www.supertext.com/person/en/account/signin. Generi la Sua chiave API in https://www.supertext.com/en/integrations/api (richiede il ruolo Admin).',
  'error.noFileId': 'Supertext non ha restituito un ID file.',
  'error.translationFailed': 'Supertext non è riuscito a tradurre il documento.',
  'error.limitExceeded': 'Il Suo limite di traduzione Supertext è stato superato.',
  'error.fileDeleted': 'Il file Supertext è stato eliminato prima di poter essere scaricato.',
  'error.timeout': 'Tempo scaduto in attesa della traduzione Supertext.',
  'error.emptyTranslation': 'Il documento tradotto era vuoto.',
  'error.unreachable': 'Impossibile raggiungere Supertext: {reason}',
  'error.auth':
    'Autenticazione non riuscita. Verifichi la chiave API Supertext. Non ha ancora un account Supertext? Ne crei uno su https://www.supertext.com/person/en/account/signin. Generi la Sua chiave API in https://www.supertext.com/en/integrations/api (richiede il ruolo Admin).',
  'error.notFound': 'La risorsa Supertext richiesta non è stata trovata.',
  'error.tooLarge': 'Il contenuto è troppo grande per essere tradotto da Supertext in una volta sola.',
  'error.rateLimited': 'Troppe richieste a Supertext. Riprovi tra poco.',
  'error.unavailable': 'Il servizio Supertext al momento non è disponibile.',
  'error.http': 'Supertext ha risposto con HTTP {status}.',
  'error.languagePair':
    'Supertext non traduce da «{source}» a «{target}». Verifichi i codici Supertext in Impostazioni → Lingue (per esempio de-CH o es).',
  'error.languagePairUnknown':
    'Supertext non traduce in questa lingua. Verifichi il suo codice Supertext in Impostazioni → Lingue (per esempio de-CH o es).',
  'error.incomplete': 'Supertext ha restituito una traduzione incompleta; per questa lingua non è stato salvato nulla.',
  'error.unsupportedLanguage':
    'La lingua «{code}» non ha ancora un codice Supertext, quindi non è stato inviato nulla. Chieda al Suo amministratore di impostarlo in Impostazioni → Lingue (per esempio de-CH o es).',
  'error.unsupportedFeature':
    'Supertext non offre una forma di cortesia formale o informale per questa lingua. Imposti la forma di cortesia su «Lasciare decidere a Supertext» in Impostazioni → Traduzione.',
  'error.hublTags':
    'Supertext ha restituito {received} token di personalizzazione o tag HubL su {sent}; per questa lingua non è stato salvato nulla.',
  'error.notConnected': 'HubSpot non è collegato. Lo colleghi di nuovo.',
  'error.notConfigured': 'All’app mancano le credenziali HubSpot (HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET).',
  'error.oauthFailed': 'HubSpot non ha concesso l’accesso. Si colleghi di nuovo.',
  'error.hubspotAuth': 'HubSpot ha rifiutato la connessione. Colleghi di nuovo HubSpot.',
  'error.hubspotForbidden':
    'HubSpot ha rifiutato la richiesta. All’app potrebbe mancare l’accesso a questo tipo di contenuto, oppure il Suo abbonamento HubSpot non lo include.',
  'error.hubspotNotFound': 'Non trovato in HubSpot.',
  'error.hubspotRateLimited': 'Troppe richieste a HubSpot. Riprovi tra poco.',
  'error.hubspotUnavailable': 'HubSpot al momento non è disponibile. Riprovi tra poco.',
  'error.hubspotHttp': 'HubSpot ha risposto con HTTP {status}.',
  'error.hubspotUnreachable': 'Impossibile raggiungere HubSpot: {reason}',
  'error.itemMissing': 'Il contenuto non esiste più in HubSpot.',
  'error.isTranslation': 'Questa è una versione linguistica di un altro contenuto. Traduca invece la sua versione principale.',
  'error.noSourceLanguage':
    'Il contenuto non ha una lingua in HubSpot, quindi HubSpot non può crearne una versione linguistica. Imposti la sua lingua in HubSpot oppure imposti la lingua dei Suoi contenuti nelle impostazioni.',
  'error.sameLanguage': 'Questa è la lingua del contenuto stesso.',
  'error.interrupted':
    'L’app è stata riavviata durante la traduzione. La avvii di nuovo; le lingue completate vengono mantenute.',
  'error.session': 'La Sua sessione è scaduta. Colleghi di nuovo HubSpot.',
  'error.select': 'Selezioni un contenuto e almeno una lingua.',
  'keyCheck.ok': 'Chiave API verificata: la connessione a Supertext funziona.',
  'keyCheck.invalid':
    "Supertext ha rifiutato la chiave API. Verifichi di aver copiato l'intera chiave oppure ne generi una nuova su supertext.com → Integrations → API (richiede il ruolo Admin). Non ha ancora un account Supertext? Ne crei uno su supertext.com.",
  'keyCheck.missing':
    'Non è ancora stata inserita alcuna chiave API. Non ha ancora un account Supertext? Ne crei uno su supertext.com. Generi la Sua chiave API su supertext.com → Integrations → API (richiede il ruolo Admin).',
  'keyCheck.unreachable':
    'Non è stato possibile verificare la chiave API perché Supertext non è raggiungibile. Le impostazioni sono salvate; riprovi più tardi.',
  'keyCheck.error':
    'Non è stato possibile verificare la chiave API: Supertext ha risposto con un errore ({status}). Le impostazioni sono salvate; riprovi più tardi.',
};
