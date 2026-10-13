<?php
// Splice the new store-page component into the production bundle.
// Usage: php splice.php <live.js> <compiled component> <out.js>
[$_, $liveFile, $compiledFile, $outFile] = $argv;
$s = file_get_contents($liveFile);
$compiled = trim(file_get_contents($compiledFile));

function fail(string $m): never { fwrite(STDERR, "ERROR: $m\n"); exit(1); }

// 1) Locate `Nl=()=>{ ... }` and its matching closing brace (string/template aware).
$start = strpos($s, 'Nl=()=>{');
if ($start === false || strpos($s, 'Nl=()=>{', $start + 1) !== false) fail('Nl definition not found exactly once');
$i = strpos($s, '{', $start);
$depth = 0; $inStr = null; $esc = false; $tpl = []; $end = null; $n = strlen($s);
for (; $i < $n; $i++) {
    $c = $s[$i];
    if ($inStr !== null) {
        if ($esc) { $esc = false; continue; }
        if ($c === '\\') { $esc = true; continue; }
        if ($inStr === '`' && $c === '$' && ($s[$i + 1] ?? '') === '{') { $tpl[] = $depth; $inStr = null; $depth++; $i++; continue; }
        if ($c === $inStr) $inStr = null;
        continue;
    }
    if ($c === '"' || $c === "'" || $c === '`') { $inStr = $c; continue; }
    if ($c === '{') $depth++;
    elseif ($c === '}') {
        $depth--;
        if ($tpl && end($tpl) === $depth) { array_pop($tpl); $inStr = '`'; continue; }
        if ($depth === 0) { $end = $i; break; }
    }
}
if ($end === null) fail('could not find end of Nl');
$old = substr($s, $start, $end - $start + 1);
if (!str_contains($old, 'Buscar nesta loja...') || !str_contains($old, 'topo-loja')) fail('Nl body does not look like the store page');

// compiled = "const Nl = () => {...};" (pretty or minified) -> "Nl=() => {...}"
if (!preg_match('/^const Nl ?= ?(\(\) ?=> ?\{.*\});?$/s', $compiled, $m)) fail('compiled component has unexpected shape');
$new = 'Nl=' . $m[1];
$s = substr($s, 0, $start) . $new . substr($s, $end + 1);

// 2) Extend useStore (HD) with raw fields the store page needs.
$hdOld = 'return{...Sm(e),products:(e.products??[]).map(Gi),heroSlides:(e.hero_slides??[]).map(gg)}';
if (substr_count($s, $hdOld) !== 1) fail('useStore return not found exactly once');
$hdNew = 'return{...Sm(e),phone:e.phone||void 0,email:e.email||void 0,businessHours:e.business_hours||void 0,'
    . 'minOrderValue:e.min_order_value,createdAt:e.created_at,'
    . 'products:(e.products??[]).map(slP=>({...Gi(slP),createdAt:slP.created_at,subcategoryName:slP.subcategory?slP.subcategory.name:null})),'
    . 'heroSlides:(e.hero_slides??[]).map(gg)}';
$s = str_replace($hdOld, $hdNew, $s);

file_put_contents($outFile, $s);
printf("old Nl: %d bytes -> new: %d bytes; bundle %d -> %d bytes\n", strlen($old), strlen($new), filesize($liveFile), strlen($s));
