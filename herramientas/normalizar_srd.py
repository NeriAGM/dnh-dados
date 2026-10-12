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

guardar("dominios", [{"id": slug(d["name"]), "nombre": d["name"], "descripcion": d["description"].split("###")[0].strip()} for d in leer("domains")])

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


# ---------------------------------------------------------------------
# Adversarios y entornos (panel del DJ)
# ---------------------------------------------------------------------
TIPOS_ADV = {"Solo": "solo", "Bruiser": "bruto", "Minion": "esbirro", "Leader": "lider", "Skulk": "acechador",
             "Standard": "estandar", "Ranged": "a-distancia", "Social": "social", "Support": "apoyo", "Horde": "horda"}


def dano_adv(texto):
    # "1d12+2 phy", "4 phy", "2d6 mag"
    m = re.match(r"\s*(?:(\d*)d(\d+))?\s*([+-]?\s*\d+)?\s*(phy|mag)", texto or "", re.I)
    if not m:
        raise ValueError(f"Daño de adversario que no entiendo: {texto!r}")
    dados = int(m.group(1) or 1) if m.group(2) else 0
    return {"dados": dados, "lados": int(m.group(2)) if m.group(2) else 0,
            "mod": int((m.group(3) or "0").replace(" ", "")), "tipo": "fisico" if m.group(4).lower() == "phy" else "magico"}


def umbrales_adv(texto):
    if not texto or texto.strip() == "None":
        return None
    a, b = [x.strip() for x in texto.split("/")]
    return {"mayor": entero(a), "grave": entero(b)}  # None si dice "None"


def rasgos_adv(lista):
    out = []
    for f in lista or []:
        nombre, _, clase = re.sub(r"\s*-\s*(Passive|Action|Reaction)", r" - \1", f["name"]).rpartition(" - ")
        if not nombre:
            nombre, clase = f["name"], ""
        clase = clase.strip()
        cuenta = None
        m = re.match(r"(Action|Reaction|Passive):\s*(.*countdown.*)", clase, re.I)
        if m:
            clase, cuenta = m.group(1).capitalize(), m.group(2)
        out.append({"nombre": nombre.strip(), "clase": {"Passive": "pasiva", "Action": "accion", "Reaction": "reaccion"}.get(clase, clase.lower()),
                    **({"cuenta_regresiva": cuenta} if cuenta else {}),
                    "texto": f["text"], **({"pregunta": f["question"]} if f.get("question") else {})})
    return out


def experiencias(texto):
    out = []
    for parte in (texto or "").split(","):
        m = re.match(r"\s*(.+?)\s*([+-]\d+)\s*$", parte)
        if m:
            out.append({"nombre": m.group(1), "valor": int(m.group(2))})
    return out


adversarios = []
for a in leer("adversaries"):
    tipo_txt = a["type"]
    base = tipo_txt.split(" ")[0]
    horda = re.search(r"\((\d*)/HP\)", tipo_txt)
    adversarios.append({
        "id": slug(a["name"]), "nombre": a["name"], "nivel": entero(a["tier"]),
        "tipo": TIPOS_ADV[base], "horda_por_pg": (entero(horda.group(1)) if horda and horda.group(1) else None) if horda else None,
        "descripcion": a.get("description") or "", "motivos": a.get("motives_and_tactics") or "",
        "dificultad": entero(a["difficulty"]), "umbrales": umbrales_adv(a.get("thresholds")),
        "pg": entero(a["hp"]), "estres": entero(a.get("stress"), 0),
        "ataque": {"nombre": a["attack"], "mod": entero(a["atk"], 0),
                   "alcance": ALCANCE.get(a.get("range"), "cuerpo"), "dano": dano_adv(a["damage"])},
        "experiencias": experiencias(a.get("experience")),
        "rasgos": rasgos_adv(a.get("feature")),
    })
guardar("adversarios", adversarios)

entornos = []
for e in leer("environments"):
    entornos.append({
        "id": slug(e["name"]), "nombre": e["name"], "nivel": entero(e["tier"]),
        "tipo": slug(e.get("type") or ""), "descripcion": e.get("description") or "",
        "impulsos": e.get("impulses") or "", "dificultad": entero(e.get("difficulty")),
        "posibles_adversarios": e.get("potential_adversaries") or "",
        "rasgos": rasgos_adv(e.get("feature")),
    })
guardar("entornos", entornos)
