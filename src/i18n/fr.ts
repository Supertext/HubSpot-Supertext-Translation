import type { Messages } from './en.js';

// French, formal address (vous), with the terms of HubSpot's French interface
// (pages de site web, pages de destination, articles de blog, e-mails marketing,
// base de connaissances, brouillon, publié, variante linguistique, jetons de
// personnalisation). Narrow no-break space before ? ! : ;
export const fr: Messages = {
  'nav.translate': 'Traduire',
  'nav.settings': 'Paramètres',
  'nav.language': 'Langue',

  'apiKeyHelp.text': 'Pas encore de compte Supertext ? {signup}. Générez votre clé API sous {apiKey} (rôle Admin requis).',
  'apiKeyHelp.signup': 'Créez-en un sur supertext.com',
  'apiKeyHelp.apiKey': 'supertext.com → Integrations → API',

  'connect.heading': 'Supertext Translation pour HubSpot',
  'connect.intro':
    'Traduisez vos pages de site web, pages de destination, articles de blog, e-mails marketing et articles de base de connaissances HubSpot avec Supertext AI. Chaque langue reçoit sa propre version dans HubSpot, sous forme de brouillon à vérifier.',
  'connect.point1': 'Choisissez une page, un article, un e-mail ou un article de base de connaissances, et les langues.',
  'connect.point2':
    'Les textes, titres et méta-descriptions sont traduits ; la mise en page, les images, les liens et les jetons de personnalisation restent.',
  'connect.point3': 'Vérifiez les brouillons dans HubSpot et publiez-les comme d’habitude.',
  'connect.button': 'Connecter HubSpot',
  'connect.hint':
    'Vous vous connectez à HubSpot et autorisez Supertext à lire vos contenus et à en créer des versions linguistiques. La base de connaissances est proposée si votre compte en dispose.',
  'connect.denied': 'L’accès à HubSpot n’a pas été accordé. Connectez-vous à nouveau pour utiliser l’app.',
  'connect.disconnected': 'HubSpot est déconnecté. Vos paramètres ont été supprimés.',

  'kind.site-page': 'Pages de site web',
  'kind.landing-page': 'Pages de destination',
  'kind.blog-post': 'Articles de blog',
  'kind.email': 'E-mails marketing',
  'kind.kb-article': 'Base de connaissances',

  'translate.heading': 'Traduire avec Supertext',
  'translate.intro':
    'Créez une version linguistique d’une page, d’un article, d’un e-mail ou d’un article de base de connaissances. Les versions apparaissent dans HubSpot sous forme de brouillons, liées à l’original là où HubSpot prend en charge les variantes linguistiques.',
  'translate.noKey.heading': 'Ajoutez votre clé API Supertext',
  'translate.noKey.text': 'L’app a besoin d’une clé API Supertext pour traduire. Saisissez-la sous {settings}.',
  'translate.noKey.settings': 'Paramètres',
  'translate.noLanguages.heading': 'Choisissez vos langues',
  'translate.noLanguages.text': 'Choisissez sous {settings} les langues dans lesquelles traduire.',
  'translate.step1': '1. Choisissez ce qu’il faut traduire',
  'translate.name': 'Nom',
  'translate.language': 'Langue',
  'translate.empty': 'Rien ici pour l’instant. Créez-le dans HubSpot, puis revenez ici.',
  'translate.kbMissing':
    'La base de connaissances n’est pas connectée : elle nécessite Service Hub Professional ou Enterprise, ainsi que l’accès de l’app à la base de connaissances lors de la connexion de HubSpot. Connectez HubSpot à nouveau pour l’accorder.',
  'translate.nextPage': 'Page suivante',
  'translate.firstPage': 'Première page',
  'translate.step2': '2. Choisissez les langues',
  'translate.notMapped': 'Pas encore de code Supertext (voir Paramètres)',
  'translate.from': 'Traduction depuis la langue définie pour le contenu dans HubSpot, sinon depuis : {language}.',
  'translate.fromAuto': 'Traduction depuis la langue définie pour le contenu dans HubSpot, sinon Supertext la détecte.',
  'translate.overwrite': 'Mettre à jour les versions existantes',
  'translate.overwriteHint': 'Sans cette option, les langues qui ont déjà une version sont conservées.',
  'translate.overwriteWarning':
    'Les brouillons des versions existantes seront remplacés, y compris les modifications faites à la main dans HubSpot. Leurs pages publiées restent jusqu’à ce que vous publiiez les nouveaux brouillons.',
  'translate.submit': 'Traduire avec Supertext',
  'translate.submitCount.one': 'Traduire dans {count} langue avec Supertext',
  'translate.submitCount.other': 'Traduire dans {count} langues avec Supertext',
  'translate.selectSomething': 'Sélectionnez un contenu et au moins une langue.',
  'translate.starting': 'Démarrage…',

  'state.draft': 'Brouillon',
  'state.published': 'Publié',
  'state.scheduled': 'Planifié',
  'state.other': 'Autre',

  'version.none': 'Non traduit',
  'version.exists': 'Traduit',

  'job.heading': 'Traduction',
  'job.running': 'Traduction de « {item} »… {completed} sur {total}',
  'job.done': 'Terminé : {created} créés, {updated} mis à jour, {kept} conservés, {failed} en échec.',
  'job.failed': 'La traduction s’est arrêtée : {reason}',
  'job.created': 'Nouvelle version (brouillon)',
  'job.updated': 'Brouillon mis à jour',
  'job.kept': 'Version existante, conservée',
  'job.open': 'Ouvrir dans HubSpot',
  'job.review': 'Vérifiez les brouillons dans HubSpot et publiez-les quand ils sont prêts.',
  'history.heading': 'Traductions récentes',
  'history.empty': 'Aucune traduction pour l’instant.',

  'settings.heading': 'Paramètres Supertext',
  'settings.saved': 'Paramètres enregistrés.',
  'settings.invalidCodes':
    'Enregistré, sauf ces codes, qui ne sont pas des codes Supertext (choisissez-en un dans la liste, par exemple de-CH ou es) : {codes}.',
  'settings.apiKey.heading': 'Clé API Supertext',
  'settings.apiKey.label': 'Clé API',
  'settings.apiKey.placeholder': 'Collez votre clé API Supertext',
  'settings.apiKey.placeholderSaved': 'Une clé est enregistrée (chiffrée). Saisissez-en une nouvelle pour la remplacer.',
  'settings.apiKey.server': 'Pas encore de clé propre : l’app utilise la clé définie sur le serveur.',
  'settings.apiKey.remove': 'Supprimer la clé enregistrée',
  'settings.test': 'Tester la connexion',
  'settings.testing': 'Test en cours…',
  'settings.languages.heading': 'Langues',
  'settings.languages.text':
    'HubSpot attribue une langue à chaque page, article, e-mail et article de base de connaissances. Chaque traduction devient une version dans la langue cible ; pour les pages, les pages de destination et les articles de blog, HubSpot la lie à l’original (groupe multilingue).',
  'settings.languages.source': 'Langue de vos contenus',
  'settings.languages.sourceHint':
    'Utilisée pour les contenus sans langue définie dans HubSpot. Les contenus qui en ont une sont traduits depuis leur propre langue.',
  'settings.languages.auto': 'Laisser Supertext la détecter',
  'settings.languages.targets': 'Traduire en',
  'settings.languages.code': 'Code Supertext',
  'settings.languages.codeHint':
    'Choisissez pour chaque langue celle dans laquelle Supertext traduit, par exemple Allemand suisse (de-CH) pour l’allemand. Les variantes de la même langue figurent en premier. Chaque langue est présélectionnée avec une suggestion : le même code si le code HubSpot est déjà un code Supertext (de-ch, es, nl), sinon la variante usuelle (allemand → de-DE, anglais → en-US, chinois (Chine) → zh-Hans, espagnol (Mexique) → es). Une langue sans suggestion affiche — choisir — et n’est traduite qu’une fois son code choisi.',
  'settings.languages.suggested': 'Suggérées',
  'settings.languages.all': 'Toutes les langues Supertext',
  'settings.languages.choose':
    '— choisir —',
  'settings.languages.unmapped':
    'Ces langues n’ont pas encore de code Supertext et ne sont traduites qu’une fois que vous en avez choisi un dans la colonne Code Supertext sous Langues : {languages}.',
  'settings.languages.sourceUnsupported':
    'Supertext ne connaît pas {language} comme langue de vos contenus. Saisissez son code Supertext sous Langues (par exemple en-US pour l’anglais) ou laissez Supertext la détecter.',
  'settings.languages.blogHint':
    'Articles de blog : une version linguistique va dans le blog de cette langue ; configurez donc d’abord une variante linguistique du blog dans HubSpot (Paramètres → Contenu → Blog).',
  'settings.style.heading': 'Traduction',
  'settings.style.label': 'Forme d’adresse',
  'settings.style.default': 'Laisser Supertext décider',
  'settings.style.more': 'Formelle (p. ex. « vous »)',
  'settings.style.less': 'Informelle (p. ex. « tu »)',
  'settings.style.notOffered':
    'Supertext ne propose pas de forme d’adresse formelle ou informelle pour {languages} ; ces langues sont traduites avec le réglage par défaut de Supertext.',
  'settings.keyCheck.label': 'Vérification de la clé API :',
  'settings.keyCheck.at': '(dernière vérification {time} UTC)',
  'settings.ui.heading': "Langue de l’interface",
  'settings.ui.label': "Langue de ces pages",
  'settings.ui.auto': "Automatique (langue de votre navigateur)",
  'settings.ui.help': "S’applique uniquement à ce navigateur : chaque collègue peut choisir la sienne. Elle n’a aucune influence sur les langues dans lesquelles vos contenus sont traduits.",
  'settings.reports.heading': 'Support Supertext',
  'settings.reports.label': 'Envoyer les informations de version à Supertext',
  'settings.reports.help':
    'Envoie à Supertext l’ID de votre compte HubSpot ainsi que les versions de cette application et de l’environnement d’exécution lorsque vous enregistrez ces paramètres et après une mise à jour. Le support Supertext voit ainsi quelle version vous utilisez. Aucun contenu, aucune clé API et aucune donnée personnelle ne sont transmis.',
  'settings.reports.fixed': 'Défini sur le serveur pour tous les comptes (SUPERTEXT_VERSION_REPORTS).',
  'settings.save': 'Enregistrer',
  'settings.connection.heading': 'HubSpot',
  'settings.connection.account': 'Connecté au compte HubSpot {account}.',
  'settings.connection.kb': 'Base de connaissances : connectée.',
  'settings.connection.noKb': 'Base de connaissances : non connectée (nécessite Service Hub Professional ou Enterprise).',
  'settings.connection.disconnect': 'Déconnecter HubSpot',
  'settings.connection.disconnectHint':
    'Supprime vos paramètres et les jetons enregistrés. Les versions linguistiques déjà créées restent dans HubSpot. Pour retirer aussi l’app de HubSpot, désinstallez-la dans HubSpot sous Paramètres → Intégrations → Applications connectées.',
  'settings.connection.confirm': 'Déconnecter HubSpot de Supertext ? Vos paramètres seront supprimés.',
  'settings.about.heading': 'À propos',
  'settings.about.version': 'Supertext Translation pour HubSpot, version {version}',

  'error.noApiKey':
    'Aucune clé API Supertext n’est configurée. Ajoutez-la dans les paramètres. Pas encore de compte Supertext ? Créez-en un sur https://www.supertext.com/person/en/account/signin. Générez votre clé API sous https://www.supertext.com/en/integrations/api (rôle Admin requis).',
  'error.noFileId': 'Supertext n’a pas renvoyé d’identifiant de fichier.',
  'error.translationFailed': 'Supertext n’a pas pu traduire le document.',
  'error.limitExceeded': 'Votre limite de traduction Supertext est dépassée.',
  'error.fileDeleted': 'Le fichier Supertext a été supprimé avant d’avoir pu être téléchargé.',
  'error.timeout': 'Délai dépassé en attendant la traduction Supertext.',
  'error.emptyTranslation': 'Le document traduit était vide.',
  'error.unreachable': 'Impossible de joindre Supertext : {reason}',
  'error.auth':
    'L’authentification a échoué. Veuillez vérifier la clé API Supertext. Pas encore de compte Supertext ? Créez-en un sur https://www.supertext.com/person/en/account/signin. Générez votre clé API sous https://www.supertext.com/en/integrations/api (rôle Admin requis).',
  'error.notFound': 'La ressource Supertext demandée est introuvable.',
  'error.tooLarge': 'Le contenu est trop volumineux pour être traduit par Supertext en une seule fois.',
  'error.rateLimited': 'Trop de requêtes vers Supertext. Veuillez réessayer dans un instant.',
  'error.unavailable': 'Le service Supertext est actuellement indisponible.',
  'error.http': 'Supertext a répondu avec le code HTTP {status}.',
  'error.languagePair':
    'Supertext ne traduit pas de « {source} » vers « {target} ». Vérifiez les codes Supertext sous Paramètres → Langues (par exemple de-CH ou es).',
  'error.languagePairUnknown':
    'Supertext ne traduit pas dans cette langue. Vérifiez son code Supertext sous Paramètres → Langues (par exemple de-CH ou es).',
  'error.incomplete': 'Supertext a renvoyé une traduction incomplète ; rien n’a été enregistré pour cette langue.',
  'error.unsupportedLanguage':
    'La langue « {code} » n’a pas encore de code Supertext ; rien n’a donc été envoyé. Demandez à votre administrateur d’en choisir un dans la liste Code Supertext sous Paramètres → Langues.',
  'error.unsupportedFeature':
    'Supertext ne propose pas de forme d’adresse formelle ou informelle pour cette langue. Réglez la forme d’adresse sur « Laisser Supertext décider » sous Paramètres → Traduction.',
  'error.hublTags':
    'Supertext a renvoyé {received} jetons de personnalisation ou balises HubL sur {sent} ; rien n’a été enregistré pour cette langue.',
  'error.notConnected': 'HubSpot n’est pas connecté. Connectez-le à nouveau.',
  'error.notConfigured': 'Il manque à l’app ses identifiants HubSpot (HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET).',
  'error.oauthFailed': 'HubSpot n’a pas accordé l’accès. Connectez-vous à nouveau.',
  'error.hubspotAuth': 'HubSpot a refusé la connexion. Connectez HubSpot à nouveau.',
  'error.hubspotForbidden':
    'HubSpot a refusé la requête. Il manque peut-être à l’app l’accès à ce type de contenu, ou votre abonnement HubSpot ne l’inclut pas.',
  'error.hubspotNotFound': 'Introuvable dans HubSpot.',
  'error.hubspotRateLimited': 'Trop de requêtes vers HubSpot. Veuillez réessayer dans un instant.',
  'error.hubspotUnavailable': 'HubSpot est actuellement indisponible. Veuillez réessayer dans un instant.',
  'error.blogLanguageMissing': "Le blog n’a pas encore de version « {language} » dans HubSpot ; rien n’a donc été traduit pour cette langue. Ajoutez une variante linguistique du blog dans HubSpot (Paramètres → Contenu → Blog), puis relancez la traduction.",
  'error.hubspotHttp': 'HubSpot a répondu avec le code HTTP {status}.',
  'error.hubspotUnreachable': 'Impossible de joindre HubSpot : {reason}',
  'error.itemMissing': 'Le contenu n’existe plus dans HubSpot.',
  'error.isTranslation': 'Ceci est une version linguistique d’un autre contenu. Traduisez plutôt sa version principale.',
  'error.noSourceLanguage':
    'Le contenu n’a pas de langue dans HubSpot ; HubSpot ne peut donc pas en créer de version linguistique. Définissez sa langue dans HubSpot ou définissez la langue de vos contenus dans les paramètres.',
  'error.sameLanguage': 'C’est la langue du contenu lui-même.',
  'error.interrupted': 'L’app a redémarré pendant la traduction. Relancez-la ; les langues terminées sont conservées.',
  'error.session': 'Votre session a expiré. Connectez HubSpot à nouveau.',
  'error.select': 'Sélectionnez un contenu et au moins une langue.',
  'keyCheck.ok': 'Clé API vérifiée : la connexion à Supertext fonctionne.',
  'keyCheck.invalid':
    'Supertext a refusé la clé API. Vérifiez que vous avez copié la clé entière ou générez-en une nouvelle sur supertext.com → Integrations → API (rôle Admin requis). Pas encore de compte Supertext ? Créez-en un sur supertext.com.',
  'keyCheck.missing':
    "Aucune clé API n'est encore saisie. Pas encore de compte Supertext ? Créez-en un sur supertext.com. Générez votre clé API sur supertext.com → Integrations → API (rôle Admin requis).",
  'keyCheck.unreachable':
    "La clé API n'a pas pu être vérifiée, car Supertext n'est pas joignable. Les paramètres sont enregistrés ; réessayez plus tard.",
  'keyCheck.error':
    "La clé API n'a pas pu être vérifiée : Supertext a répondu par une erreur ({status}). Les paramètres sont enregistrés ; réessayez plus tard.",
};
