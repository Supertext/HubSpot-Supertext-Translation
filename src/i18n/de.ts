import type { Messages } from './en.js';

// German (Swiss spelling, formal address), with the terms of HubSpot's German
// interface (Website-Seiten, Landingpages, Blogbeiträge, Marketing-E-Mails,
// Wissensdatenbank, Entwurf, Veröffentlicht, Sprachvariante, Personalisierungstoken).
export const de: Messages = {
  'nav.translate': 'Übersetzen',
  'nav.settings': 'Einstellungen',
  'nav.language': 'Sprache',

  'apiKeyHelp.text':
    'Noch kein Supertext-Konto? {signup}. Generieren Sie Ihren API-Schlüssel unter {apiKey} (erfordert die Admin-Rolle).',
  'apiKeyHelp.signup': 'Erstellen Sie eines auf supertext.com',
  'apiKeyHelp.apiKey': 'supertext.com → Integrations → API',

  'connect.heading': 'Supertext Translation für HubSpot',
  'connect.intro':
    'Übersetzen Sie Ihre HubSpot-Website-Seiten, Landingpages, Blogbeiträge, Marketing-E-Mails und Wissensdatenbank-Artikel mit Supertext AI. Jede Sprache erhält in HubSpot eine eigene Version, als Entwurf zur Prüfung.',
  'connect.point1': 'Wählen Sie eine Seite, einen Beitrag, eine E-Mail oder einen Artikel und die Sprachen aus.',
  'connect.point2':
    'Texte, Titel und Meta-Beschreibungen werden übersetzt; Layout, Bilder, Links und Personalisierungstoken bleiben erhalten.',
  'connect.point3': 'Prüfen Sie die Entwürfe in HubSpot und veröffentlichen Sie sie wie gewohnt.',
  'connect.button': 'HubSpot verbinden',
  'connect.hint':
    'Sie melden sich bei HubSpot an und erlauben Supertext, Ihre Inhalte zu lesen und Sprachversionen davon zu erstellen. Die Wissensdatenbank wird angeboten, wenn Ihr Account sie hat.',
  'connect.denied': 'Der Zugriff auf HubSpot wurde nicht gewährt. Verbinden Sie HubSpot erneut, um die App zu nutzen.',
  'connect.disconnected': 'HubSpot ist getrennt. Ihre Einstellungen wurden entfernt.',

  'kind.site-page': 'Website-Seiten',
  'kind.landing-page': 'Landingpages',
  'kind.blog-post': 'Blogbeiträge',
  'kind.email': 'Marketing-E-Mails',
  'kind.kb-article': 'Wissensdatenbank',

  'translate.heading': 'Mit Supertext übersetzen',
  'translate.intro':
    'Erstellen Sie eine Sprachversion einer Seite, eines Beitrags, einer E-Mail oder eines Artikels. Die Versionen erscheinen in HubSpot als Entwürfe, mit dem Original verknüpft, wo HubSpot Sprachvarianten unterstützt.',
  'translate.noKey.heading': 'Supertext-API-Schlüssel hinzufügen',
  'translate.noKey.text':
    'Die App benötigt einen Supertext-API-Schlüssel, bevor sie übersetzen kann. Geben Sie ihn unter {settings} ein.',
  'translate.noKey.settings': 'Einstellungen',
  'translate.noLanguages.heading': 'Sprachen auswählen',
  'translate.noLanguages.text': 'Wählen Sie unter {settings} die Sprachen aus, in die übersetzt werden soll.',
  'translate.step1': '1. Auswählen, was übersetzt wird',
  'translate.name': 'Name',
  'translate.language': 'Sprache',
  'translate.empty': 'Hier gibt es noch nichts. Erstellen Sie es in HubSpot und kehren Sie dann hierher zurück.',
  'translate.kbMissing':
    'Die Wissensdatenbank ist nicht verbunden: Sie erfordert Service Hub Professional oder Enterprise und den Zugriff der App auf die Wissensdatenbank beim Verbinden von HubSpot. Verbinden Sie HubSpot erneut, um ihn zu gewähren.',
  'translate.nextPage': 'Nächste Seite',
  'translate.firstPage': 'Erste Seite',
  'translate.step2': '2. Sprachen auswählen',
  'translate.notMapped': 'Noch kein Supertext-Code (siehe Einstellungen)',
  'translate.from': 'Übersetzt wird aus der Sprache, die in HubSpot für den Inhalt festgelegt ist, sonst aus {language}.',
  'translate.fromAuto':
    'Übersetzt wird aus der Sprache, die in HubSpot für den Inhalt festgelegt ist, sonst erkennt Supertext sie.',
  'translate.overwrite': 'Vorhandene Versionen aktualisieren',
  'translate.overwriteHint': 'Ohne diese Option bleiben Sprachen, für die es bereits eine Version gibt, unverändert.',
  'translate.overwriteWarning':
    'Die Entwürfe der vorhandenen Versionen werden ersetzt, auch Änderungen, die in HubSpot von Hand gemacht wurden. Ihre veröffentlichten Seiten bleiben, bis Sie die neuen Entwürfe veröffentlichen.',
  'translate.submit': 'Mit Supertext übersetzen',
  'translate.submitCount.one': 'In {count} Sprache mit Supertext übersetzen',
  'translate.submitCount.other': 'In {count} Sprachen mit Supertext übersetzen',
  'translate.selectSomething': 'Wählen Sie einen Inhalt und mindestens eine Sprache aus.',
  'translate.starting': 'Wird gestartet…',

  'state.draft': 'Entwurf',
  'state.published': 'Veröffentlicht',
  'state.scheduled': 'Geplant',
  'state.other': 'Andere',

  'version.none': 'Nicht übersetzt',
  'version.exists': 'Übersetzt',

  'job.heading': 'Übersetzung',
  'job.running': '«{item}» wird übersetzt… {completed} von {total}',
  'job.done': 'Fertig: {created} erstellt, {updated} aktualisiert, {kept} beibehalten, {failed} fehlgeschlagen.',
  'job.failed': 'Die Übersetzung wurde abgebrochen: {reason}',
  'job.created': 'Neue Version (Entwurf)',
  'job.updated': 'Entwurf aktualisiert',
  'job.kept': 'Version vorhanden, beibehalten',
  'job.open': 'In HubSpot öffnen',
  'job.review': 'Prüfen Sie die Entwürfe in HubSpot und veröffentlichen Sie sie, wenn sie bereit sind.',
  'history.heading': 'Letzte Übersetzungen',
  'history.empty': 'Noch keine Übersetzungen.',

  'settings.heading': 'Supertext-Einstellungen',
  'settings.saved': 'Einstellungen gespeichert.',
  'settings.invalidCodes':
    'Gespeichert, ausser diesen Codes, die keine Supertext-Codes sind (wählen Sie einen aus der Liste, zum Beispiel de-CH oder es): {codes}.',
  'settings.apiKey.heading': 'Supertext-API-Schlüssel',
  'settings.apiKey.label': 'API-Schlüssel',
  'settings.apiKey.placeholder': 'Fügen Sie Ihren Supertext-API-Schlüssel ein',
  'settings.apiKey.placeholderSaved':
    'Ein Schlüssel ist gespeichert (verschlüsselt). Geben Sie einen neuen ein, um ihn zu ersetzen.',
  'settings.apiKey.server': 'Noch kein eigener Schlüssel: Die App verwendet den auf dem Server hinterlegten Schlüssel.',
  'settings.apiKey.remove': 'Gespeicherten Schlüssel entfernen',
  'settings.test': 'Verbindung testen',
  'settings.testing': 'Wird getestet…',
  'settings.languages.heading': 'Sprachen',
  'settings.languages.text':
    'HubSpot gibt jeder Seite, jedem Beitrag, jeder E-Mail und jedem Artikel eine Sprache. Jede Übersetzung wird eine Version in der Zielsprache; bei Seiten, Landingpages und Blogbeiträgen verknüpft HubSpot sie mit dem Original (mehrsprachige Gruppe).',
  'settings.languages.source': 'Sprache Ihrer Inhalte',
  'settings.languages.sourceHint':
    'Gilt für Inhalte, für die in HubSpot keine Sprache festgelegt ist. Inhalte mit einer Sprache werden aus ihrer eigenen Sprache übersetzt.',
  'settings.languages.auto': 'Von Supertext erkennen lassen',
  'settings.languages.targets': 'Übersetzen in',
  'settings.languages.code': 'Supertext-Code',
  'settings.languages.codeHint':
    'Wählen Sie für jede Sprache, in welche Sprache Supertext übersetzt, zum Beispiel Schweizer Hochdeutsch (de-CH) für Deutsch. Die Varianten derselben Sprache stehen zuoberst. Vorausgewählt ist jeweils ein Vorschlag: derselbe Code, wo der HubSpot-Code bereits ein Supertext-Code ist (de-ch, es, nl), sonst die übliche Variante (Deutsch → de-DE, Englisch → en-US, Chinesisch (China) → zh-Hans, Spanisch (Mexiko) → es). Eine Sprache ohne Vorschlag zeigt — auswählen — und wird erst übersetzt, wenn Sie ihren Code wählen.',
  'settings.languages.suggested': 'Vorgeschlagen',
  'settings.languages.all': 'Alle Supertext-Sprachen',
  'settings.languages.choose':
    '— auswählen —',
  'settings.languages.unmapped':
    'Diese Sprachen haben noch keinen Supertext-Code und werden erst übersetzt, wenn Sie unter Sprachen in der Spalte Supertext-Code einen auswählen: {languages}.',
  'settings.languages.sourceUnsupported':
    'Supertext kennt {language} nicht als Sprache Ihrer Inhalte. Geben Sie unter Sprachen ihren Supertext-Code ein (zum Beispiel en-US für Englisch) oder lassen Sie Supertext sie erkennen.',
  'settings.languages.blogHint':
    'Blogbeiträge: Eine Sprachversion kommt in den Blog dieser Sprache. Richten Sie deshalb zuerst in HubSpot eine Sprachvariante des Blogs ein (Einstellungen → Content → Blog).',
  'settings.style.heading': 'Übersetzung',
  'settings.style.label': 'Anrede',
  'settings.style.default': 'Supertext entscheiden lassen',
  'settings.style.more': 'Formell (z. B. «Sie»)',
  'settings.style.less': 'Informell (z. B. «du»)',
  'settings.style.notOffered':
    'Supertext bietet für {languages} keine formelle oder informelle Anrede an; diese Sprachen werden mit der Vorgabe von Supertext übersetzt.',
  'settings.keyCheck.label': 'Prüfung des API-Schlüssels:',
  'settings.keyCheck.at': '(zuletzt geprüft {time} UTC)',
  'settings.ui.heading': "Sprache der Oberfläche",
  'settings.ui.label': "Sprache dieser Seiten",
  'settings.ui.auto': "Automatisch (Sprache Ihres Browsers)",
  'settings.ui.help': "Gilt nur für diesen Browser, so kann jede Kollegin und jeder Kollege die eigene wählen. Sie hat keinen Einfluss darauf, in welche Sprachen Ihre Inhalte übersetzt werden.",
  'settings.reports.heading': 'Supertext-Support',
  'settings.reports.label': 'Versionsinformationen an Supertext senden',
  'settings.reports.help':
    'Sendet die ID Ihres HubSpot-Accounts sowie die Versionen dieser App und der Laufzeitumgebung an Supertext, wenn Sie diese Einstellungen speichern und nach einem Update. So sieht der Supertext-Support, welche Version Sie einsetzen. Es werden keine Inhalte, kein API-Schlüssel und keine Personendaten übertragen.',
  'settings.reports.fixed': 'Auf dem Server für alle Accounts festgelegt (SUPERTEXT_VERSION_REPORTS).',
  'settings.save': 'Speichern',
  'settings.connection.heading': 'HubSpot',
  'settings.connection.account': 'Verbunden mit dem HubSpot-Account {account}.',
  'settings.connection.kb': 'Wissensdatenbank: verbunden.',
  'settings.connection.noKb': 'Wissensdatenbank: nicht verbunden (erfordert Service Hub Professional oder Enterprise).',
  'settings.connection.disconnect': 'HubSpot trennen',
  'settings.connection.disconnectHint':
    'Entfernt Ihre Einstellungen und die gespeicherten Tokens. Bereits erstellte Sprachversionen bleiben in HubSpot. Um die App auch aus HubSpot zu entfernen, deinstallieren Sie sie in HubSpot unter Einstellungen → Integrationen → Verknüpfte Apps.',
  'settings.connection.confirm': 'HubSpot von Supertext trennen? Ihre Einstellungen werden entfernt.',
  'settings.about.heading': 'Über',
  'settings.about.version': 'Supertext Translation für HubSpot, Version {version}',

  'error.noApiKey':
    'Kein Supertext-API-Schlüssel eingerichtet. Fügen Sie ihn unter Einstellungen hinzu. Noch kein Supertext-Konto? Erstellen Sie eines auf https://www.supertext.com/person/en/account/signin. Generieren Sie Ihren API-Schlüssel unter https://www.supertext.com/en/integrations/api (erfordert die Admin-Rolle).',
  'error.noFileId': 'Supertext hat keine Datei-ID zurückgegeben.',
  'error.translationFailed': 'Supertext konnte das Dokument nicht übersetzen.',
  'error.limitExceeded': 'Ihr Supertext-Übersetzungslimit ist überschritten.',
  'error.fileDeleted': 'Die Supertext-Datei wurde gelöscht, bevor sie heruntergeladen werden konnte.',
  'error.timeout': 'Zeitüberschreitung beim Warten auf die Supertext-Übersetzung.',
  'error.emptyTranslation': 'Das übersetzte Dokument war leer.',
  'error.unreachable': 'Supertext ist nicht erreichbar: {reason}',
  'error.auth':
    'Authentifizierung fehlgeschlagen. Bitte prüfen Sie den Supertext-API-Schlüssel. Noch kein Supertext-Konto? Erstellen Sie eines auf https://www.supertext.com/person/en/account/signin. Generieren Sie Ihren API-Schlüssel unter https://www.supertext.com/en/integrations/api (erfordert die Admin-Rolle).',
  'error.notFound': 'Die angeforderte Supertext-Ressource wurde nicht gefunden.',
  'error.tooLarge': 'Der Inhalt ist zu gross, um ihn bei Supertext in einem Durchgang zu übersetzen.',
  'error.rateLimited': 'Zu viele Anfragen an Supertext. Bitte versuchen Sie es in Kürze erneut.',
  'error.unavailable': 'Der Supertext-Dienst ist derzeit nicht verfügbar.',
  'error.http': 'Supertext hat mit HTTP {status} geantwortet.',
  'error.languagePair':
    'Supertext übersetzt nicht aus «{source}» in «{target}». Prüfen Sie die Supertext-Codes unter Einstellungen → Sprachen (zum Beispiel de-CH oder es).',
  'error.languagePairUnknown':
    'Supertext übersetzt nicht in diese Sprache. Prüfen Sie ihren Supertext-Code unter Einstellungen → Sprachen (zum Beispiel de-CH oder es).',
  'error.incomplete': 'Supertext hat eine unvollständige Übersetzung zurückgegeben; für diese Sprache wurde nichts gespeichert.',
  'error.unsupportedLanguage':
    'Die Sprache «{code}» hat noch keinen Supertext-Code, deshalb wurde nichts gesendet. Bitten Sie Ihre Administratorin oder Ihren Administrator, ihn unter Einstellungen → Sprachen in der Auswahlliste Supertext-Code auszuwählen.',
  'error.unsupportedFeature':
    'Supertext bietet für diese Sprache keine formelle oder informelle Anrede an. Stellen Sie die Anrede unter Einstellungen → Übersetzung auf «Supertext entscheiden lassen».',
  'error.hublTags':
    'Supertext hat {received} von {sent} Personalisierungstoken oder HubL-Tags zurückgegeben; für diese Sprache wurde nichts gespeichert.',
  'error.notConnected': 'HubSpot ist nicht verbunden. Verbinden Sie es erneut.',
  'error.notConfigured': 'Der App fehlen ihre HubSpot-Zugangsdaten (HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET).',
  'error.oauthFailed': 'HubSpot hat den Zugriff nicht gewährt. Verbinden Sie erneut.',
  'error.hubspotAuth': 'HubSpot hat die Verbindung abgelehnt. Verbinden Sie HubSpot erneut.',
  'error.hubspotForbidden':
    'HubSpot hat die Anfrage abgelehnt. Möglicherweise fehlt der App der Zugriff auf diese Art von Inhalten, oder Ihr HubSpot-Abonnement umfasst sie nicht.',
  'error.hubspotNotFound': 'In HubSpot nicht gefunden.',
  'error.hubspotRateLimited': 'Zu viele Anfragen an HubSpot. Bitte versuchen Sie es in Kürze erneut.',
  'error.hubspotUnavailable': 'HubSpot ist derzeit nicht verfügbar. Bitte versuchen Sie es in Kürze erneut.',
  'error.blogLanguageMissing': "Der Blog hat in HubSpot noch keine Version für «{language}», deshalb wurde für diese Sprache nichts übersetzt. Fügen Sie dem Blog in HubSpot eine Sprachvariante hinzu (Einstellungen → Content → Blog) und übersetzen Sie dann erneut.",
  'error.hubspotHttp': 'HubSpot hat mit HTTP {status} geantwortet.',
  'error.hubspotUnreachable': 'HubSpot ist nicht erreichbar: {reason}',
  'error.itemMissing': 'Den Inhalt gibt es in HubSpot nicht mehr.',
  'error.isTranslation': 'Dies ist eine Sprachversion eines anderen Inhalts. Übersetzen Sie stattdessen dessen primäre Version.',
  'error.noSourceLanguage':
    'Für den Inhalt ist in HubSpot keine Sprache festgelegt, deshalb kann HubSpot keine Sprachversion davon erstellen. Legen Sie seine Sprache in HubSpot fest oder legen Sie unter Einstellungen die Sprache Ihrer Inhalte fest.',
  'error.sameLanguage': 'Das ist die Sprache des Inhalts selbst.',
  'error.interrupted':
    'Die App wurde während der Übersetzung neu gestartet. Starten Sie sie erneut; fertige Sprachen bleiben erhalten.',
  'error.session': 'Ihre Sitzung ist abgelaufen. Verbinden Sie HubSpot erneut.',
  'error.select': 'Wählen Sie einen Inhalt und mindestens eine Sprache aus.',
  'keyCheck.ok': 'API-Schlüssel geprüft: Die Verbindung zu Supertext funktioniert.',
  'keyCheck.invalid':
    'Supertext hat den API-Schlüssel abgelehnt. Prüfen Sie, ob Sie den ganzen Schlüssel kopiert haben, oder erstellen Sie einen neuen unter supertext.com → Integrations → API (erfordert die Rolle Admin). Noch kein Supertext-Konto? Erstellen Sie eines auf supertext.com.',
  'keyCheck.missing':
    'Es ist noch kein API-Schlüssel eingetragen. Noch kein Supertext-Konto? Erstellen Sie eines auf supertext.com. Ihren API-Schlüssel erstellen Sie unter supertext.com → Integrations → API (erfordert die Rolle Admin).',
  'keyCheck.unreachable':
    'Der API-Schlüssel konnte nicht geprüft werden, weil Supertext nicht erreichbar ist. Die Einstellungen sind gespeichert; prüfen Sie ihn später erneut.',
  'keyCheck.error':
    'Der API-Schlüssel konnte nicht geprüft werden: Supertext hat mit einem Fehler geantwortet ({status}). Die Einstellungen sind gespeichert; prüfen Sie ihn später erneut.',
};
