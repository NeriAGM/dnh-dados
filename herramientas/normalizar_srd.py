"""Convierte el JSON comunitario del SRD 1.0 (seansbox/daggerheart-srd) en
datos limpios para la app: identificadores estables, números como números,
daño separado en dados/modificador/tipo.

Uso: python3 herramientas/normalizar_srd.py RUTA/.build/03_json datos/fuente
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ORIGEN = Path(sys.argv[1])
DESTINO = Path(sys.argv[2])
DESTINO.mkdir(parents=True, exist_ok=True)


def leer(nombre):
    return json.loads((ORIGEN / f"{nombre}.json").read_text(encoding="utf-8-sig"))


def slug(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")


def entero(v, defecto=None):
    if v in (None, ""):
        return defecto
    m = re.search(r"-?\d+", str(v))
    return int(m.group()) if m else defecto


def rasgos(lista):
    return [{"nombre": f["name"], "texto": f["text"]} for f in (lista or [])]


RASGO = {"Agility": "agilidad", "Strength": "fuerza", "Finesse": "sutileza",
         "Instinct": "instinto", "Presence": "presencia", "Knowledge": "conocimiento",
         "Spellcast": "lanzamiento"}
ALCANCE = {"Melee": "cuerpo", "Very Close": "muy-cercano", "Close": "cercano",
           "Far": "lejano", "Very Far": "muy-lejano"}


def dano(texto):
    # "d8+3 phy", "2d10 mag", "d12 phy"
    m = re.match(r"\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*(phy|mag)", texto or "", re.I)
    if not m:
        raise ValueError(f"Daño que no entiendo: {texto!r}")
    return {
        "dados": int(m.group(1) or 1),
        "lados": int(m.group(2)),
        "mod": int(m.group(3).replace(" ", "")) if m.group(3) else 0,
        "tipo": "fisico" if m.group(4).lower() == "phy" else "magico",
    }


def guardar(nombre, datos):
    (DESTINO / f"{nombre}.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{nombre}: {len(datos)}")


# Dominios y cartas
cartas = []
for a in leer("abilities"):
    cartas.append({
        "id": slug(a["name"]), "nombre": a["name"], "dominio": slug(a["domain"]),
        "nivel": entero(a["level"]), "recuerdo": entero(a["recall"], 0),
        "tipo": {"Ability": "habilidad", "Spell": "hechizo", "Grimoire": "grimorio"}[a["type"]],
        "texto": a["text"],
    })
guardar("cartas", cartas)

guardar("dominios", [{"id": slug(d["name"]), "nombre": d["name"], "descripcion": d["description"]} for d in leer("domains")])

# Clases y subclases
subclases_por_nombre = {s["name"]: s for s in leer("subclasses")}
clases, subclases = [], []
for c in leer("classes"):
    cid = slug(c["name"])
    clases.append({
        "id": cid, "nombre": c["name"], "descripcion": c["description"],
        "dominios": [slug(c["domain_1"]), slug(c["domain_2"])],
        "evasion": entero(c["evasion"]), "pg": entero(c["hp"]),
        "esperanza": {"nombre": c["hope_feature_name"], "texto": c["hope_feature_text"]},
        "rasgos": rasgos(c["feature"]),
        "objetos": c["items"],
        "sugerido": {
            "rasgos": [entero(x) for x in c["suggested_traits"].split(",")],
            "armadura": c["suggested_armor"], "primaria": c["suggested_primary"],
            "secundaria": c.get("suggested_secondary") or None,
        },
        "preguntas_trasfondo": [q["question"] for q in c.get("background") or []],
        "preguntas_conexion": [q["question"] for q in c.get("connection") or []],
        "subclases": [slug(c["subclass_1"]), slug(c["subclass_2"])],
    })
    for clave in ("subclass_1", "subclass_2"):
        s = subclases_por_nombre[c[clave]]
        subclases.append({
            "id": slug(s["name"]), "clase": cid, "nombre": s["name"], "descripcion": s["description"],
            "rasgo_lanzamiento": RASGO.get((s.get("spellcast_trait") or "").strip()),
            "base": rasgos(s["foundation"]), "especializacion": rasgos(s["specialization"]),
            "maestria": rasgos(s["mastery"]),
        })
guardar("clases", clases)
guardar("subclases", subclases)

guardar("ancestrias", [{"id": slug(a["name"]), "nombre": a["name"], "descripcion": a["description"], "rasgos": rasgos(a["feature"])} for a in leer("ancestries")])
guardar("comunidades", [{"id": slug(c["name"]), "nombre": c["name"], "descripcion": c["description"], "nota": c.get("note") or "", "rasgos": rasgos(c["feature"])} for c in leer("communities")])

# Equipo
armas = []
for w in leer("weapons"):
    d = dano(w["damage"])
    armas.append({
        "id": slug(w["name"]), "nombre": w["name"], "nivel": entero(w["tier"]),
        "tipo": "primaria" if w["primary_or_secondary"] == "Primary" else "secundaria",
        "rasgo": RASGO[w["trait"]], "alcance": ALCANCE[w["range"]],
        "dano": d, "manos": 2 if "Two" in w["burden"] else 1,
        "rasgos": rasgos(w.get("feature")),
    })
guardar("armas", armas)

armaduras = []
for a in leer("armor"):
    mayor, grave = [entero(x) for x in a["base_thresholds"].split("/")]
    armaduras.append({
        "id": slug(a["name"]), "nombre": a["name"], "nivel": entero(a["tier"]),
        "puntuacion": entero(a["base_score"]), "umbrales": {"mayor": mayor, "grave": grave},
        "rasgos": rasgos(a.get("feature")),
    })
guardar("armaduras", armaduras)

guardar("objetos", [{"id": slug(i["name"]), "nombre": i["name"], "texto": i["description"], "tirada": entero(i["roll"])} for i in leer("items")])
guardar("consumibles", [{"id": slug(i["name"]), "nombre": i["name"], "texto": i["description"], "tirada": entero(i["roll"])} for i in leer("consumables")])
guardar("formas_bestia", [{
    "id": slug(b["name"]), "nombre": b["name"], "nivel": entero(b["tier"]), "ejemplos": b.get("examples", ""),
    "rasgo": b.get("trait_bonus", ""), "evasion": b.get("evasion_bonus", ""), "ataque": b.get("attack", ""),
    "ventajas": b.get("advantages", ""), "rasgos": rasgos(b.get("feature")),
} for b in leer("beastforms")])

# Revisión de ids duplicados
for f in DESTINO.glob("*.json"):
    ids = [x["id"] for x in json.loads(f.read_text())]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        print("¡IDS REPETIDOS!", f.name, dup)
