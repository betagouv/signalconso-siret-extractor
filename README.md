# signalconso-siret-extractor

Service d'extraction de SIRET ou SIREN d'un site web

## Fonctionnement

### Calcul de l'URL à requêter

Le endpoint prend en entrée le nom de domaine à interroger. Il faut donc calculer l'url manuellement.

1. On commence par tester les 4 schemas classiques. Par exemple, pour le domaine example.com, on essaye https://example.com, http://example.com, https://www.example.com, http://www.example.com
2. On s'arrête si on obtient une réponse positive (2XX) ou un redirect (3XX) que l'on va suivre
3. Si aucun ne fonctionne, on essaye de corriger une faute de frappe classique : les utilisateurs on tendance à écrire wwwexample.com en nom de domaine. On essaye donc d'ajouter le point manquant.

### Recherche du sitemap

1. Une fois l'url déterminée, on récupère le `robots.txt` pour en extraire l'url du sitemap.xml.
2. Si aucun sitemap n'est dans le `robots.txt`, on fallback sur example.com/sitemap.xml

### Extraction via le sitemap

1. Si le sitemap existe, on récupère l'ensemble des liens (récursivement)
2. On filtre les liens pour ne garder que les "candidats" potentiels. Par exemple, un lien contenant "mentions-legales" devrait contenir les informations recherchées.
3. Pour chaque lien restant, on recherche un SIRET ou un SIREN

### Extraction via la homepage

1. Si le sitemap n'existe pas ou si aucun siret n'a été trouvé, on essaye d'extraire les liens depuis la homepage
2. On ne traite que la homepage pour limiter la recherche dans le temps

### Algo d'extraction

1. On récupère le HTML de la page
2. On filtre toutes les balises script / meta etc. qui ne contiennent normalement pas les informations voulues.
3. On ne conserve que le contenu des balises
4. On recherche textuellement un SIREN ou un SIRET via une regexp
5. On filtre les SIRET ou SIREN des hébergeurs (via une variable d'env) qui sont souvent présents sur les sites, mais ne sont pas ceux que l'on veut extraire.

### points techniques

1. Pour éviter les requêtes trop longus, chaque fetch possède un timeout
2. Certains sitemaps contiennent des CDATA, il faut les traiter spécialement pour extraire les liens
