#!/usr/bin/env python3
"""
Genera el Manual de Usuario en Word a partir de las capturas de la aplicacion.

El manual es visual a proposito: cada pantalla ocupa una pagina, con la imagen
grande y unos pocos pasos numerados debajo. Va dirigido a personas que no han
usado la plataforma, y para ellas una imagen explica mas que un parrafo.

    python scripts/generar-manual.py

Antes hay que tener las capturas:
    npm run dev
    npx tsx scripts/datos-demostracion.ts <guia.pdf> <guia-maestros.pdf>
    node scripts/capturar-manual.mjs
"""

from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

RAIZ = Path(__file__).resolve().parent.parent
CAPTURAS = RAIZ / "manual" / "capturas"
SALIDA = RAIZ / "MANUAL-DE-USUARIO.docx"

TERRACOTA = RGBColor(0xB8, 0x48, 0x2A)
VERDE = RGBColor(0x17, 0x75, 0x75)
GRIS = RGBColor(0x5A, 0x52, 0x4C)
TINTA = RGBColor(0x2D, 0x1E, 0x16)
FUENTE = "Arial"

ANCHO_IMAGEN = Cm(16.5)

figura = 0


# --------------------------------------------------------------------- Word

def sombrear(celda, color):
    s = OxmlElement("w:shd")
    s.set(qn("w:val"), "clear")
    s.set(qn("w:fill"), color)
    celda._tc.get_or_add_tcPr().append(s)


def campo(parrafo, instruccion):
    inicio = OxmlElement("w:fldChar")
    inicio.set(qn("w:fldCharType"), "begin")
    texto = OxmlElement("w:instrText")
    texto.set(qn("xml:space"), "preserve")
    texto.text = instruccion
    fin = OxmlElement("w:fldChar")
    fin.set(qn("w:fldCharType"), "end")
    corrida = parrafo.add_run()._r
    for e in (inicio, texto, fin):
        corrida.append(e)


def preparar(doc):
    s = doc.sections[0]
    s.orientation = WD_ORIENT.PORTRAIT
    s.top_margin = s.bottom_margin = Cm(2)
    s.left_margin = s.right_margin = Cm(2.2)

    normal = doc.styles["Normal"]
    normal.font.name = FUENTE
    normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.1

    pie = s.footer.paragraphs[0]
    pie.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pie.add_run("Manual de Usuario · Memoria El Salado · ")
    campo(pie, "PAGE")
    for c in pie.runs:
        c.font.name = FUENTE
        c.font.size = Pt(8)
        c.font.color.rgb = GRIS


def salto(doc):
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def titulo(doc, texto, nivel=2):
    p = doc.add_paragraph(style=f"Heading {nivel}")
    p.paragraph_format.space_before = Pt(0 if nivel == 2 else 12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    c = p.add_run(texto)
    c.bold = True
    c.font.name = FUENTE
    c.font.size = Pt(17 if nivel == 2 else 13)
    c.font.color.rgb = TERRACOTA if nivel == 2 else TINTA
    return p


def parrafo(doc, trozos, tamano=11, color=None, espacio=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(espacio)
    for texto, negrita in trozos:
        c = p.add_run(texto)
        c.bold = negrita
        c.font.name = FUENTE
        c.font.size = Pt(tamano)
        if color:
            c.font.color.rgb = color
    return p


def imagen(doc, archivo, pie):
    """Coloca una captura a lo ancho de la caja de texto, con su pie."""
    global figura
    ruta = CAPTURAS / archivo
    if not ruta.exists():
        raise SystemExit(f"Falta la captura: {archivo}")

    figura += 1
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(str(ruta), width=ANCHO_IMAGEN)

    pp = doc.add_paragraph()
    pp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pp.paragraph_format.space_after = Pt(8)
    a = pp.add_run(f"Figura {figura}. ")
    a.bold = True
    b = pp.add_run(pie)
    for c in (a, b):
        c.font.name = FUENTE
        c.font.size = Pt(9)
        c.font.color.rgb = GRIS


def pasos(doc, lista):
    """Pasos numerados: una linea cada uno, con la accion en negrita."""
    for i, item in enumerate(lista, start=1):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.8)
        p.paragraph_format.first_line_indent = Cm(-0.8)
        p.paragraph_format.space_after = Pt(3)

        n = p.add_run(f"{i}.  ")
        n.bold = True
        n.font.color.rgb = TERRACOTA
        n.font.name = FUENTE
        n.font.size = Pt(11)

        for texto, negrita in item:
            c = p.add_run(texto)
            c.bold = negrita
            c.font.name = FUENTE
            c.font.size = Pt(11)


def aviso(doc, texto):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.4)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    a = p.add_run("⚠  ")
    a.bold = True
    a.font.color.rgb = TERRACOTA
    b = p.add_run(texto)
    for c in (a, b):
        c.font.name = FUENTE
        c.font.size = Pt(10)
        c.font.color.rgb = GRIS


def tabla(doc, filas, anchos=None):
    t = doc.add_table(rows=1, cols=len(filas[0]))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER

    for celda, texto in zip(t.rows[0].cells, filas[0]):
        celda.text = ""
        sombrear(celda, "F5EDE7")
        c = celda.paragraphs[0].add_run(texto)
        c.bold = True
        c.font.name = FUENTE
        c.font.size = Pt(9.5)

    for fila in filas[1:]:
        celdas = t.add_row().cells
        for celda, texto in zip(celdas, fila):
            celda.text = ""
            c = celda.paragraphs[0].add_run(texto)
            c.font.name = FUENTE
            c.font.size = Pt(9.5)

    for fila in t.rows:
        for celda in fila.cells:
            celda.paragraphs[0].paragraph_format.space_after = Pt(2)
    if anchos:
        for fila in t.rows:
            for celda, ancho in zip(fila.cells, anchos):
                celda.width = ancho

    doc.add_paragraph().paragraph_format.space_after = Pt(4)


def pantalla(doc, encabezado, archivo, pie, lista, nota=None, nivel=2):
    """Una pantalla del sistema: titulo, captura y pasos. Ocupa una pagina."""
    titulo(doc, encabezado, nivel)
    imagen(doc, archivo, pie)
    if lista:
        pasos(doc, lista)
    if nota:
        aviso(doc, nota)
    salto(doc)


# ------------------------------------------------------------------ Portada

def portada(doc):
    for _ in range(2):
        doc.add_paragraph()

    for texto, tam, color, neg in [
        ("MANUAL DE USUARIO", 13, GRIS, True),
        ("Memoria El Salado", 36, TERRACOTA, True),
    ]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(4)
        c = p.add_run(texto)
        c.bold = neg
        c.font.name = FUENTE
        c.font.size = Pt(tam)
        c.font.color.rgb = color

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(16)
    c = p.add_run("Guía visual paso a paso")
    c.font.name = FUENTE
    c.font.size = Pt(13)
    c.font.color.rgb = GRIS

    imagen(doc, "10-estudiante-mapa.png", "La pantalla de inicio del estudiante: el Mapa del Viaje.")

    for texto in [
        "Trabajo de grado — Programa de Ingeniería de Software",
        "Universidad Manuela Beltrán",
        "Fabian Santiago Tobón Valero · Daniel Alejandro León Ladino",
    ]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        c = p.add_run(texto)
        c.bold = texto.startswith("Universidad")
        c.font.name = FUENTE
        c.font.size = Pt(10.5)
        c.font.color.rgb = GRIS

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(10)
    c = p.add_run("Versión 2.0 · Agosto de 2026")
    c.font.name = FUENTE
    c.font.size = Pt(9.5)
    c.font.color.rgb = GRIS

    salto(doc)


# --------------------------------------------------------------------- Guia

def construir():
    doc = Document()
    preparar(doc)
    portada(doc)

    # ------------------------------------------------------------ Qué es
    titulo(doc, "Qué es esta plataforma")
    parrafo(doc, [
        ("Memoria El Salado es una plataforma para trabajar en clase la memoria histórica del "
         "conflicto armado colombiano. El contenido no viene escrito dentro del programa: se "
         "construye a partir de las guías del ", False),
        ("Centro Nacional de Memoria Histórica", True),
        (" en PDF.", False),
    ])

    titulo(doc, "Quién puede hacer qué", 3)
    tabla(doc, [
        ["Perfil", "Qué hace", "A quién da de alta"],
        ["Administrador", "Importa las guías y arma los módulos", "A los docentes"],
        ["Docente", "Publica sesiones y sigue al grupo", "A sus estudiantes"],
        ["Estudiante", "Recorre la ruta y hace las actividades", "A nadie"],
    ], anchos=[Cm(3.6), Cm(8.4), Cm(4.5)])

    aviso(doc, "Nadie se registra por su cuenta. Cada persona recibe su usuario de quien está "
               "un nivel por encima.")

    titulo(doc, "Cómo está organizado el contenido", 3)
    parrafo(doc, [
        ("Un ", False), ("módulo", True), (" (por ejemplo, El Salado) se divide en ", False),
        ("ejes", True), (", cada eje en ", False), ("sesiones", True),
        (", y cada sesión tiene ", False), ("una actividad", True),
        (". El estudiante abre las sesiones desde el mapa.", False),
    ])
    salto(doc)

    # ---------------------------------------------------------- Entrar
    titulo(doc, "1.  Entrar a la plataforma")
    imagen(doc, "01-login-vacio.png", "Pantalla de entrada.")
    pasos(doc, [
        [("Abre el navegador en ", False), ("http://localhost:3000", True), (".", False)],
        [("Pulsa tu ", False), ("rol", True), (": Estudiante, Docente o Administrador.", False)],
        [("Escribe tu ", False), ("usuario", True), (" y tu ", False), ("contraseña", True), (".", False)],
        [("Pulsa ", False), ("Entrar a la Plataforma", True), (".", False)],
    ])
    aviso(doc, "Si eliges un rol que no es el tuyo, el sistema no te deja entrar aunque la "
               "contraseña sea correcta. Es la causa más común de error al iniciar sesión.")
    salto(doc)

    pantalla(
        doc,
        "2.  La primera vez: elige tu contraseña",
        "09-primer-ingreso.png",
        "Hasta que elijas tu contraseña, la plataforma no te deja pasar a ninguna otra pantalla.",
        [
            [("Escribe la ", False), ("contraseña provisional", True), (" que te entregaron.", False)],
            [("Escribe la ", False), ("nueva", True), (" y ", False), ("repítela", True), (" debajo.", False)],
            [("Mira la lista roja: te dice qué le falta a tu contraseña.", False)],
            [("Cuando no quede ningún aviso, pulsa ", False), ("Guardar y continuar", True), (".", False)],
        ],
        "Tu contraseña necesita 10 caracteres o más, con mayúscula, minúscula, número y símbolo. "
        "No puede llevar tu nombre ni tu usuario.",
    )

    # ---------------------------------------------------------- Estudiante
    titulo(doc, "Guía del estudiante")
    parrafo(doc, [
        ("Tu menú tiene solo dos opciones: el ", False), ("Mapa del Viaje", True),
        (", desde donde entras a todo, y ", False), ("Mi Diario", True), (".", False),
    ])
    imagen(doc, "10-estudiante-mapa.png", "Cada tarjeta es un eje, con su avance.")
    pasos(doc, [
        [("Arriba ves tus ", False), ("aportes", True), (", ", False), ("lugares marcados", True),
         (" y ", False), ("memorias sembradas", True), (".", False)],
        [("Pulsa una tarjeta de eje para ver sus sesiones.", False)],
    ])
    salto(doc)

    pantalla(
        doc,
        "Abrir una sesión",
        "11-estudiante-mapa-eje.png",
        "Al desplegar un eje aparecen sus sesiones con el botón Abrir.",
        [
            [("Las sesiones ", False), ("publicadas", True), (" tienen el botón ", False), ("Abrir", True), (".", False)],
            [("Las que están en gris aún no las habilitó tu docente.", False)],
            [("Pulsa ", False), ("Abrir", True), (" para entrar a la actividad.", False)],
        ],
        "Cada sesión lleva su propia actividad y su propio texto, tomado de la guía del CNMH.",
        nivel=3,
    )

    pantalla(
        doc,
        "Actividad: cartografía social",
        "12-estudiante-cartografia.png",
        "Marca en un mapa real los lugares que tienen significado para ti.",
        [
            [("Haz clic en el ", False), ("mapa", True), (" sobre el lugar que quieres marcar.", False)],
            [("Escribe el ", False), ("nombre del lugar", True), (" y tu ", False), ("relato", True), (".", False)],
            [("Elige las ", False), ("sensaciones", True), (" que te evoca.", False)],
            [("Guarda. Tu marca aparece para todo el grupo.", False)],
        ],
        nivel=3,
    )

    pantalla(
        doc,
        "Actividad: tradición oral",
        "13-estudiante-tradicion-oral.png",
        "A la izquierda, el texto de la guía; a la derecha, tu respuesta.",
        [
            [("Lee el ", False), ("texto de la sesión", True), (" en el panel izquierdo.", False)],
            [("Escribe tu respuesta en el panel derecho.", False)],
            [("Pulsa ", False), ("Guardar respuesta", True), (". Puedes volver y cambiarla.", False)],
        ],
        nivel=3,
    )

    pantalla(
        doc,
        "Actividad: archivo y anotaciones",
        "14-estudiante-anotaciones.png",
        "El texto del documento, con las anotaciones del grupo al lado.",
        [
            [("Lee el documento. Está dividido por apartados.", False)],
            [("Haz ", False), ("clic sobre un párrafo", True), (" para citarlo.", False)],
            [("Escribe tu reflexión abajo a la derecha.", False)],
            [("Pulsa ", False), ("Publicar anotación", True), (".", False)],
        ],
        nivel=3,
    )

    pantalla(
        doc,
        "Actividad: simulador de tierras",
        "15-estudiante-simulador.png",
        "Repartes 200 hectáreas y $100.000 entre 20 familias.",
        [
            [("Asigna ", False), ("hectáreas", True), (" a cada familia.", False)],
            [("Añade ", False), ("subsidios", True), (" de riego o agricultura si lo ves necesario.", False)],
            [("Vigila el panel de ", False), ("criterios de validación", True), (".", False)],
            [("Guarda cuando estés conforme.", False)],
        ],
        "No hay una única respuesta correcta. El ejercicio sirve para ver las tensiones entre "
        "atender a todos y atender bien a quien más lo necesita.",
        nivel=3,
    )

    pantalla(
        doc,
        "Mi Diario",
        "16-estudiante-diario.png",
        "Espacio personal. Tú decides qué se comparte.",
        [
            [("Elige ", False), ("cómo te sientes", True), (".", False)],
            [("Escribe lo que quieras recordar.", False)],
            [("Marca ", False), ("compartir", True), (" solo si quieres que tu docente lo lea.", False)],
        ],
        "Tus entradas son privadas por defecto. Nadie puede leer una entrada que no hayas "
        "marcado como compartida.",
        nivel=3,
    )

    # ------------------------------------------------------------- Docente
    titulo(doc, "Guía del docente")
    imagen(doc, "03-docente-panel.png", "Panel del docente: avance del grupo y control de sesiones.")
    pasos(doc, [
        [("Mira el ", False), ("progreso colectivo", True), (" y el avance por eje.", False)],
        [("En ", False), ("Gestión de Sesiones", True), (", el interruptor publica o retira cada sesión.", False)],
        [("Solo las publicadas aparecen en el mapa del estudiante.", False)],
    ])
    salto(doc)

    pantalla(
        doc,
        "Dar de alta a tus estudiantes",
        "05-docente-estudiantes.png",
        "El formulario ya propone una contraseña provisional.",
        [
            [("Escribe el ", False), ("nombre", True), (" y el ", False), ("usuario", True), (".", False)],
            [("Elige la ", False), ("subpoblación", True), (" (solo se usa en los reportes).", False)],
            [("Pulsa ", False), ("Crear estudiante", True), (".", False)],
            [("Copia las ", False), ("credenciales", True), (" y entrégaselas.", False)],
        ],
        "La contraseña provisional no se vuelve a mostrar. Anótala antes de salir de la pantalla.",
        nivel=3,
    )

    pantalla(
        doc,
        "Consultar las guías del módulo",
        "04-docente-contenidos.png",
        "Las guías del CNMH, incluida la de maestros que el estudiante no puede abrir.",
        [
            [("Arriba están las ", False), ("guías del módulo activo", True), (".", False)],
            [("La marcada ", False), ("Solo docentes", True), (" es tu material de preparación.", False)],
            [("Debajo cargas ", False), ("recursos", True), (" (vídeo, audio, documentos).", False)],
        ],
        nivel=3,
    )

    pantalla(
        doc,
        "Reportes por subpoblaciones",
        "06-docente-subpoblaciones.png",
        "Avance comparado según el vínculo de cada estudiante con el conflicto.",
        [
            [("Revisa el ", False), ("avance", True), (" y las ", False), ("entregas", True),
             (" de cada subpoblación.", False)],
            [("Lee la ", False), ("recomendación", True), (" pedagógica de cada fila.", False)],
            [("Pulsa ", False), ("Generar reporte", True), (" para dejarlo por escrito.", False)],
        ],
        "Sirve para ver si el curso está afectando de forma distinta a unos y a otros. No es "
        "una calificación.",
        nivel=3,
    )

    pantalla(
        doc,
        "Debates y foros",
        "07-docente-foros.png",
        "Debate estructurado en dos roles contrapuestos.",
        [
            [("Escribe la ", False), ("pregunta orientadora", True), (".", False)],
            [("Define los dos ", False), ("roles", True), (" que sostendrán posiciones distintas.", False)],
            [("El interruptor abre o cierra la participación.", False)],
        ],
        nivel=3,
    )

    # ------------------------------------------------------- Administrador
    titulo(doc, "Guía del administrador")
    imagen(doc, "17-admin-docentes.png", "Alta de docentes y entrega de credenciales.")
    pasos(doc, [
        [("Escribe el ", False), ("nombre", True), (" y el ", False), ("usuario", True), (" del docente.", False)],
        [("Acepta la contraseña propuesta o pulsa ", False), ("Generar otra", True), (".", False)],
        [("Pulsa ", False), ("Crear docente", True), (" y copia las credenciales.", False)],
        [("Si alguien la pierde, usa ", False), ("Restablecer contraseña", True), (".", False)],
    ])
    salto(doc)

    pantalla(
        doc,
        "Importar una guía en PDF",
        "18-admin-importar.png",
        "Los documentos cargados, con su módulo y su visibilidad.",
        [
            [("Sube el PDF y pulsa ", False), ("Analizar documento", True), (".", False)],
            [("Revisa la estructura: títulos, actividad y ", False), ("texto de cada sesión", True), (".", False)],
            [("Completa a mano el texto que no se haya podido extraer.", False)],
            [("Da nombre al módulo y créalo.", False)],
        ],
        nivel=3,
    )

    titulo(doc, "Las dos guías del CNMH", 3)
    parrafo(doc, [
        ("Cada caso se publica en dos documentos, y no cumplen la misma función:", False),
    ])
    tabla(doc, [
        ["Documento", "Para qué sirve", "Quién puede abrirlo"],
        ["Guía del estudiante\n(el-salado.pdf)", "Construir el módulo: trae la ruta y las actividades",
         "Todos"],
        ["Guía para maestros\n(el-salado_guia-para-maestros.pdf)",
         "Preparar la clase: trae las orientaciones y lo que se espera que descubran",
         "Solo el docente"],
    ], anchos=[Cm(5.2), Cm(7.5), Cm(3.8)])

    pasos(doc, [
        [("Importa la ", False), ("guía del estudiante", True), (" y crea el módulo con ella.", False)],
        [("Sube la ", False), ("guía para maestros", True), (".", False)],
        [("Pulsa ", False), ("Reservar al docente", True), (" sobre ella.", False)],
        [("En su selector, elige el módulo para asociarla.", False)],
    ])
    aviso(doc, "Si el estudiante puede abrir la guía para maestros, la actividad pierde sentido: "
               "le entrega de antemano las respuestas a las que debía llegar solo.")
    salto(doc)

    pantalla(
        doc,
        "Módulos geográficos",
        "19-admin-casos.png",
        "Los casos de estudio creados, ubicados en el mapa de Colombia.",
        [
            [("Consulta el ", False), ("estado", True), (" y el número de sesiones de cada módulo.", False)],
            [("Crea un caso nuevo heredando la estructura del activo.", False)],
            [("Usa ", False), ("Eliminar módulo", True), (" para rehacer una importación.", False)],
        ],
        "Eliminar un módulo borra también el trabajo que los estudiantes hicieron en sus "
        "sesiones. El PDF de origen no se toca.",
        nivel=3,
    )

    pantalla(
        doc,
        "Auditoría de accesibilidad",
        "20-admin-accesibilidad.png",
        "Revisión de transcripción, contraste y adaptación a pantallas pequeñas.",
        [
            [("Lanza la auditoría sobre los recursos cargados.", False)],
            [("Revisa el ", False), ("cumplimiento global", True), (" y el detalle por recurso.", False)],
            [("Registra las correcciones desde la columna de acción.", False)],
        ],
        nivel=3,
    )

    # ------------------------------------------------------- Cosas comunes
    titulo(doc, "Cambiar tu contraseña cuando quieras")
    imagen(doc, "08-cambiar-contrasena.png", "Se llega desde «Cambiar mi contraseña», al pie del menú.")
    pasos(doc, [
        [("Escribe tu ", False), ("contraseña actual", True), (".", False)],
        [("Escribe la ", False), ("nueva", True), (" dos veces.", False)],
        [("Pulsa ", False), ("Guardar y continuar", True), (".", False)],
    ])
    salto(doc)

    # ------------------------------------------------------ Si algo falla
    titulo(doc, "Si algo no funciona")
    tabla(doc, [
        ["Lo que ves", "Por qué pasa", "Qué hacer"],
        ["«Credenciales incorrectas o el rol no corresponde»",
         "El rol elegido no es el tuyo, o hay un error al escribir",
         "Revisa primero el rol; es lo más común"],
        ["Vuelve siempre a «Elige tu contraseña»",
         "Todavía usas la contraseña provisional",
         "Complétala: es obligatorio"],
        ["No veo ninguna sesión",
         "El docente no las ha publicado",
         "Pídele que las habilite en su panel"],
        ["«El documento no traía texto para esta sesión»",
         "El PDF no desarrollaba esa parte",
         "El administrador puede pegarlo al importar"],
        ["El mapa se ve como una cuadrícula",
         "No hay conexión a internet",
         "Nada: la actividad funciona igual"],
        ["Olvidé mi contraseña",
         "No se puede recuperar, está cifrada",
         "Pide una nueva a quien creó tu cuenta"],
    ], anchos=[Cm(5.2), Cm(5.5), Cm(5.8)])

    titulo(doc, "Antes de cerrar", 3)
    parrafo(doc, [
        ("Pulsa ", False), ("Salir", True),
        (" en la esquina superior derecha, sobre todo si el computador es compartido.", False),
    ])

    doc.save(SALIDA)
    print(f"Manual generado: {SALIDA.name} · {figura} figuras")


if __name__ == "__main__":
    construir()
