<?php
declare(strict_types=1);
$base='https://superloja.vip';
$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH)?:'/';
function api(string $url){
 $ctx=stream_context_create(['http'=>['timeout'=>12,'ignore_errors'=>true,'header'=>"Accept: application/json\r\nUser-Agent: SuperLojaSEO/2.0\r\n"],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
 $raw=@file_get_contents($url,false,$ctx);$status=0;
 foreach(($http_response_header??[]) as $line){if(preg_match('~^HTTP/\S+ (\d+)~',$line,$m))$status=(int)$m[1];}
 if($status===404)return null;
 $data=$raw?json_decode($raw,true):null;
 if($status!==200||!is_array($data)){http_response_code(503);header('Retry-After: 300');header('Cache-Control: no-store');exit('Serviço temporariamente indisponível. Tente novamente.');}
 return $data;
}
function missingPage(){http_response_code(404);header('X-Robots-Tag: noindex');header('Content-Type: text/html; charset=UTF-8');echo '<!doctype html><html lang="pt-AO"><head><title>Página não encontrada — SuperLoja</title><meta name="robots" content="noindex"><link rel="icon" href="/superloja-favicon-v3.ico"></head><body><main><h1>Página não encontrada</h1><p>Este endereço não existe ou já não está disponível.</p><a href="/">Voltar à SuperLoja</a> · <a href="/lojas">Ver lojas</a></main></body></html>';exit;}
function plain($v,$max=160){$t=trim(preg_replace('/\s+/u',' ',strip_tags(html_entity_decode((string)$v,ENT_QUOTES|ENT_HTML5,'UTF-8'))));return mb_strlen($t)>$max?rtrim(mb_substr($t,0,$max-1)).'…':$t;}
function e($v){return htmlspecialchars((string)$v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function absurl($v){if(!$v)return '';return preg_match('~^https?://~i',$v)?$v:'https://superloja.vip'.('/'.ltrim($v,'/'));}
function injectMeta($html,$title,$desc,$canonical,$image,$jsonld,$type='website',$extra=''){
 $html=preg_replace('~<html lang="[^"]*"~i','<html lang="pt-AO"',$html,1);
 $html=preg_replace('~<title>.*?</title>~s','<title>'.e($title).'</title>',$html,1);
 $desc=plain($desc);
 $html=preg_replace('~<meta name="description" content="[^"]*"\s*/?>~','<meta name="description" content="'.e($desc).'" />',$html,1);
 $html=preg_replace('~\s*<link rel="canonical"[^>]*>~i','',$html);
 $html=preg_replace('~\s*<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>~i','',$html);
 $html=preg_replace('~\s*<script type="application/ld\+json">.*?</script>~is','',$html);
 $tags="\n".'<link rel="canonical" href="'.e($canonical).'" />'."\n".'<meta property="og:type" content="'.e($type).'" />'."\n".'<meta property="og:title" content="'.e($title).'" />'."\n".'<meta property="og:description" content="'.e($desc).'" />'."\n".'<meta property="og:url" content="'.e($canonical).'" />'."\n".'<meta property="og:image" content="'.e($image).'" />'."\n".'<meta property="og:site_name" content="SuperLoja" />'."\n".'<meta property="og:locale" content="pt_AO" />'."\n".'<meta name="twitter:card" content="summary_large_image" />'."\n".'<meta name="twitter:title" content="'.e($title).'" />'."\n".'<meta name="twitter:description" content="'.e($desc).'" />'."\n".'<meta name="twitter:image" content="'.e($image).'" />'."\n".$extra.'<script type="application/ld+json">'.json_encode($jsonld,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_HEX_TAG|JSON_HEX_AMP).'</script>'."\n";
 return str_replace('</head>',$tags.'</head>',$html);
}
$aliases=['/produtos'=>'/pesquisa','/login'=>'/entrar','/registar'=>'/entrar','/registar-loja'=>'/cadastro-loja'];
if(isset($aliases[$path])){header('Location: '.$aliases[$path],true,301);exit;}
if($path!=='/'&&str_ends_with($path,'/')){header('Location: '.rtrim($path,'/'),true,301);exit;}
$public=['/','/faq','/categorias','/lojas','/ofertas','/pesquisa','/cadastro-loja','/como-comprar','/termos','/privacidade','/contacto'];
$privateRoute=preg_match('~^/(?:entrar|checkout|carrinho|favoritos|minha-loja|minha-conta|admin|loja/[^/]+/painel)(?:/|$)~',$path);
if(!in_array($path,$public,true)&&!$privateRoute&&!preg_match('~^/(?:produto|lojas|categoria)/[^/]+$~',$path))missingPage();
$dist=__DIR__.'/dist/index.html';$html=@file_get_contents($dist);if(!$html){http_response_code(500);exit('Frontend indisponivel');}
$title='SuperLoja — Compre online em lojas de Angola';
$desc='Encontre produtos com preço, disponibilidade e contacto direto de lojas angolanas verificadas.';
$canonical=$base.$path;$image=$base.'/og-superloja.jpg';
$json=['@context'=>'https://schema.org','@graph'=>[['@type'=>'Organization','@id'=>$base.'/#organization','name'=>'SuperLoja','url'=>$base,'logo'=>$base.'/logo-superloja.png','email'=>'info@superloja.vip','telephone'=>'+244 939729902','address'=>['@type'=>'PostalAddress','addressLocality'=>'Luanda','addressCountry'=>'AO'],'sameAs'=>['https://www.instagram.com/superloja.vip/','https://www.facebook.com/superlojavp']],['@type'=>'WebSite','@id'=>$base.'/#website','name'=>'SuperLoja','url'=>$base,'publisher'=>['@id'=>$base.'/#organization'],'inLanguage'=>'pt-AO','potentialAction'=>['@type'=>'SearchAction','target'=>['@type'=>'EntryPoint','urlTemplate'=>$base.'/pesquisa?q={search_term_string}'],'query-input'=>'required name=search_term_string']]]];
$siteGraph=$json['@graph'];$ogType='website';$extraMeta='';
$crumb=fn(array $items)=>['@type'=>'BreadcrumbList','itemListElement'=>array_map(fn($i,$n)=>['@type'=>'ListItem','position'=>$n+1,'name'=>$i[0],'item'=>$i[1]],$items,array_keys($items))];
$body='<main aria-label="Conteúdo SuperLoja" style="max-width:1200px;margin:24px auto;padding:16px;font-family:Arial,sans-serif"><h1>'.e($title).'</h1><p>'.e($desc).'</p>';
if($path==='/faq'){
 $title='Perguntas frequentes — SuperLoja';$desc='Respostas sobre compras, pagamentos, entregas, lojas e suporte na SuperLoja.';
 $faqs=[['Como comprar na SuperLoja?','Escolha um produto, adicione ao carrinho, informe os dados de entrega e selecione a forma de pagamento disponibilizada pela loja.'],['Como contactar uma loja?','Nas páginas da loja e do carrinho pode usar o botão de WhatsApp quando a loja disponibiliza esse canal.'],['Como funciona a entrega?','O prazo, o custo e as zonas de entrega dependem da loja e são apresentados durante a compra.'],['Como confirmar a disponibilidade?','A disponibilidade indicada vem do stock informado pela loja. Antes da conclusão, o sistema volta a validar os itens do pedido.']];
 $json=['@context'=>'https://schema.org','@type'=>'FAQPage','mainEntity'=>array_map(fn($f)=>['@type'=>'Question','name'=>$f[0],'acceptedAnswer'=>['@type'=>'Answer','text'=>$f[1]]],$faqs)];
 $body='<main aria-label="Perguntas frequentes SuperLoja" style="max-width:900px;margin:24px auto;padding:16px;font-family:Arial,sans-serif"><h1>'.e($title).'</h1><p>'.e($desc).'</p>';foreach($faqs as $f){$body.='<section><h2>'.e($f[0]).'</h2><p>'.e($f[1]).'</p></section>';}
}elseif(preg_match('~^/lojas/([^/]+)~',$path,$m)){
 $s=api($base.'/api/stores/'.rawurlencode($m[1]));if(!$s||!isset($s['name']))missingPage();
 if(is_array($s)&&isset($s['name'])){$title=$s['name'].' — Loja na SuperLoja';$desc=$s['meta_description']?:$s['description'];$image=absurl($s['banner']?:$s['logo']);$json=['@context'=>'https://schema.org','@type'=>'Store','@id'=>$canonical.'#store','name'=>$s['name'],'url'=>$canonical,'description'=>$desc,'image'=>$image,'logo'=>absurl($s['logo']??''),'telephone'=>$s['phone']?:$s['whatsapp'],'address'=>['@type'=>'PostalAddress','addressLocality'=>$s['city']??'Luanda','addressRegion'=>$s['province']??'Luanda','addressCountry'=>'AO'],'sameAs'=>array_values(array_filter((array)($s['socials']??[]),fn($u)=>is_string($u)&&preg_match('~^https?://~i',$u)))];$json=['@context'=>'https://schema.org','@graph'=>[array_diff_key($json,['@context'=>1]),$crumb([['Início',$base],['Lojas',$base.'/lojas'],[$s['name'],$canonical]])]];$body='<main aria-label="Loja na SuperLoja" style="max-width:1200px;margin:24px auto;padding:16px;font-family:Arial,sans-serif"><article><h1>'.e($s['name']).'</h1><p>'.e($desc).'</p><p>'.e(($s['city']??'').', '.($s['province']??'')).'</p></article>';}
}elseif(preg_match('~^/produto/([^/]+)~',$path,$m)){
 $p=api($base.'/api/products/'.rawurlencode($m[1]));if(!$p||!isset($p['name']))missingPage();
 if(is_array($p)&&isset($p['name'])){
  $pc=$p['category_relation']??null;
  $title=$p['name'].' — SuperLoja';$desc=plain($p['description']??'')?:('Compre '.$p['name'].' por '.number_format((float)$p['price'],0,',','.').' Kz.');$image=absurl($p['images'][0]??'');$stock=((int)($p['stock']??0))>0?'https://schema.org/InStock':'https://schema.org/OutOfStock';
  $product=['@type'=>'Product','@id'=>$canonical.'#product','name'=>$p['name'],'description'=>$desc,'image'=>array_map('absurl',$p['images']??[]),'sku'=>(string)($p['id']??''),'category'=>$pc['name']??($p['category']??null),'url'=>$canonical,'brand'=>['@type'=>'Brand','name'=>$p['store']['name']??'SuperLoja'],'offers'=>['@type'=>'Offer','url'=>$canonical,'priceCurrency'=>'AOA','price'=>(string)$p['price'],'availability'=>$stock,'itemCondition'=>'https://schema.org/NewCondition','seller'=>['@type'=>'Organization','name'=>$p['store']['name']??'SuperLoja']]];
  $breadcrumbs=$crumb(array_values(array_filter([['Início',$base],is_array($pc)&&!empty($pc['slug'])?[$pc['name'],$base.'/categoria/'.$pc['slug']]:null,[$p['name'],$canonical]])));
  $ogType='product';$extraMeta='<meta property="product:price:amount" content="'.e((string)(float)$p['price']).'" />'."\n".'<meta property="product:price:currency" content="AOA" />'."\n".'<meta property="product:availability" content="'.(((int)($p['stock']??0))>0?'in stock':'out of stock').'" />'."\n";
  $json=['@context'=>'https://schema.org','@graph'=>[$product,$breadcrumbs]];
  $body='<main aria-label="Produto SuperLoja" style="max-width:1200px;margin:24px auto;padding:16px;font-family:Arial,sans-serif"><article><h1>'.e($p['name']).'</h1>'.($image?'<img src="'.e($image).'" alt="'.e($p['name']).'" width="320" height="320">':'').'<p>'.e($desc).'</p><p><strong>'.e(number_format((float)$p['price'],0,',','.')).' Kz</strong> — '.(((int)($p['stock']??0))>0?'Disponível':'Sem stock').'</p></article>';
 }
}elseif($path==='/'||$path==='/categorias'||str_starts_with($path,'/categoria/')||$path==='/lojas'||$path==='/pesquisa'||$path==='/ofertas'){
 $cats=api($base.'/api/categories')?:[];$prod=api($base.'/api/products')?:[];$products=$prod['data']??$prod;
 if($path==='/categorias'){$title='Categorias de produtos — SuperLoja';$desc='Explore categorias e encontre produtos disponíveis em lojas de Angola.';}
 elseif($path==='/lojas'){$title='Lojas de Angola — SuperLoja';$desc='Conheça lojas presentes na SuperLoja e consulte os seus produtos, contactos e localização.';}
 elseif(preg_match('~^/categoria/([^/]+)$~',$path,$cm)){
  $category=null;foreach($cats as $c){if(($c['slug']??'')===$cm[1]){$category=$c;break;}}
  if(!$category)missingPage();
  $title=$category['name'].' em Angola — SuperLoja';$desc='Produtos de '.$category['name'].' nas lojas da SuperLoja.';
  $filtered=api($base.'/api/products?category='.rawurlencode($category['name']));$products=$filtered['data']??$filtered;
 }
 if($path==='/pesquisa'){$title='Pesquisar produtos — SuperLoja';$desc='Explore o catálogo de produtos das lojas da SuperLoja.';}
 if($path==='/ofertas'){$title='Ofertas — SuperLoja';$desc='Consulte as ofertas disponíveis nas lojas.';$filtered=api($base.'/api/products/flash-sale');$products=$filtered['data']??$filtered;}
 $body='<main><h1>'.e($title).'</h1><p>'.e($desc).'</p>';
 if(!$products&&str_starts_with($path,'/categoria/'))$privateRoute=true;
 $body.='<nav aria-label="Categorias"><h2>Categorias</h2><ul>';foreach(array_slice($cats,0,24) as $c){$body.='<li><a href="/categoria/'.e($c['slug']).'">'.e(($c['icon']??'').' '.$c['name']).'</a> ('.e($c['product_count']??0).' produtos)</li>';}$body.='</ul></nav><section><h2>Produtos disponíveis</h2><ul>';
 $items=[];foreach(array_slice($products,0,24) as $p){$img=absurl($p['images'][0]??'');$available=((int)($p['stock']??0))>0;$body.='<li><a href="/produto/'.e($p['slug']).'">'.($img?'<img src="'.e($img).'" alt="'.e($p['name']).'" width="120" height="120" loading="lazy">':'').'<strong>'.e($p['name']).'</strong></a> — '.e(number_format((float)$p['price'],0,',','.')).' Kz — '.($available?'Disponível':'Sem stock').'</li>';$items[]=['@type'=>'ListItem','position'=>count($items)+1,'url'=>$base.'/produto/'.$p['slug'],'name'=>$p['name']];}$body.='</ul></section>';$json=['@context'=>'https://schema.org','@type'=>'ItemList','name'=>'Produtos na SuperLoja','itemListElement'=>$items];
 if($path==='/')$json=['@context'=>'https://schema.org','@graph'=>array_merge($siteGraph,[array_diff_key($json,['@context'=>1])])];
 elseif(!empty($category))$json=['@context'=>'https://schema.org','@graph'=>[array_diff_key($json,['@context'=>1]),$crumb([['Início',$base],['Categorias',$base.'/categorias'],[$category['name'],$canonical]])]];
}
if($path==='/lojas'){
 $stores=api($base.'/api/stores');$body='<main><h1>Lojas na SuperLoja</h1><ul>';$entries=[];
 foreach($stores as $st){$url=$base.'/lojas/'.$st['slug'];$body.='<li><h2><a href="'.e($url).'">'.e($st['name']).'</a></h2><p>'.e($st['description']??'').'</p></li>';$entries[]=['@type'=>'ListItem','position'=>count($entries)+1,'url'=>$url,'name'=>$st['name']];}
 $body.='</ul>';$json=['@context'=>'https://schema.org','@type'=>'ItemList','itemListElement'=>$entries];
}
if(isset($s['products'])&&str_starts_with($path,'/lojas/')){ $body.='<h2>Produtos da loja</h2><ul>';foreach($s['products'] as $sp){$body.='<li><a href="/produto/'.e($sp['slug']).'">'.e($sp['name']).'</a> — '.e($sp['price']).' Kz</li>';}$body.='</ul>';}
$info=['/contacto'=>['Contacto','Contacte a SuperLoja através de info@superloja.vip. Para informações sobre um produto ou pedido, contacte a loja responsável.'], '/como-comprar'=>['Como comprar','Explore produtos e lojas, consulte o preço e a disponibilidade e adicione os artigos ao carrinho. Informe os dados de entrega e selecione uma forma de pagamento disponível. Confirme os detalhes com a loja responsável.'], '/cadastro-loja'=>['Abrir uma loja','Registe a sua loja na SuperLoja. Preencha os dados da loja, localização e contactos para análise do registo.'], '/termos'=>['Termos de uso','Consulte os termos de utilização da plataforma SuperLoja, incluindo as responsabilidades de compradores e vendedores.'], '/privacidade'=>['Política de privacidade','Consulte como a SuperLoja trata os dados pessoais e os contactos disponíveis para questões de privacidade.']];
if(isset($info[$path])){[$heading,$desc]=$info[$path];$title=$heading.' — SuperLoja';$body='<main><h1>'.e($heading).'</h1><p>'.e($desc).'</p><a href="/lojas">Consultar lojas</a>';$json=['@context'=>'https://schema.org','@type'=>'WebPage','name'=>$title,'url'=>$canonical,'description'=>$desc];}
$body.='</main>';
if($privateRoute||$path==='/pesquisa'){$html=preg_replace('~<meta name="robots" content="[^"]*"\s*/?>~i','<meta name="robots" content="noindex, nofollow" />',$html,1);header('X-Robots-Tag: noindex, nofollow');}
$html=injectMeta($html,$title,$desc,$canonical,$image?:$base.'/og-superloja.jpg',$json,$ogType,$extraMeta);
$html=str_replace('<div id="root"></div>','<div id="root">'.$body.'</div>',$html);
header('Content-Type: text/html; charset=UTF-8');header('Cache-Control: no-cache, max-age=0, must-revalidate');echo $html;
