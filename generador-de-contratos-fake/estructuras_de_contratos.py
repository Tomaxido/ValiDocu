import random
from typing import Callable, Dict, List, Tuple

from faker import Faker

fake = Faker('es_CL')


class EstructurasContrato:
    @staticmethod
    def formatear_rut_con_puntos(rut: str) -> str:
        """Convierte 12345678-9 en 12.345.678-9"""
        cuerpo, dv = rut.split('-')
        cuerpo_puntos = f"{int(cuerpo):,}".replace(",", ".")
        return f"{cuerpo_puntos}-{dv}"

    @staticmethod
    def generar_rut(puntos: bool = False) -> str:
        numero = fake.random_int(min=10000000, max=25000000)
        dv = fake.random_element(elements=['K', 'k', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
        rut = f"{numero}-{dv}"
        if puntos:
            rut = EstructurasContrato.formatear_rut_con_puntos(rut)
        return rut


    @staticmethod
    def generar_diccionario_base() -> Dict[str, str]:
        nombre_persona = fake.name()
        nombre_empresa = fake.company()
        puntos = random.choice([True, False])
        return dict(
            nombre_persona=nombre_persona,
            rut_persona=EstructurasContrato.generar_rut(puntos=puntos),
            direccion=fake.address().replace('\n', ', '),
            nombre_empresa=nombre_empresa,
            rut_empresa=EstructurasContrato.generar_rut(puntos=puntos),
            firma_persona=nombre_persona,
            firma_empresa=nombre_empresa,
        )

    @staticmethod
    def obtener_palabras_y_etiquetas(
        plantilla_contrato: str, diccionario: Dict[str, str]
    ) -> tuple[list[str], list[str]]:
        tokens = plantilla_contrato.strip().split()
        palabras = [t for t in tokens if len(t) > 0 and not t.startswith("_")]
        etiquetas = ["O" for _ in palabras]

        etiqueta_a_llaves = {
            "NOMBRE_COMPLETO": ["nombre_persona", "deudor_representante", "corredor_representante"],
            "EMPRESA": ["nombre_empresa", "nombre_titular", "deudor_empresa", "corredor_empresa"],
            "DIRECCION": ["direccion", "deudor_domicilio", "corredor_domicilio"],
            "RUT": ["rut_persona", "rut_empresa", "deudor_rut", "deudor_ci", "corredor_rut", "corredor_ci"],
            "FECHA": ["fecha", "plazo_fecha"],
            "MONTO": ["monto", "capital"],
            "PLAZO": [],  # TODO: incluir plazos
            "TAZA": ["tasa", "taza"],
            "TIPO_DOCUMENTO": ["tipo_documento"],
            "FIRMA": ["firma_persona", "firma_empresa", "firma_deudor", "firma_corredor"],
        }
        for i in range(len(palabras)-1, -1, -1):
            inicio = palabras[i].find("{")
            fin = palabras[i].find("}")
            if inicio == -1 or fin == -1:
                continue
            llave = palabras[i][inicio+1:fin]
            palabras_reemplazo = diccionario[llave].split()
            palabras_reemplazo[0] = palabras[i][:inicio] + palabras_reemplazo[0]
            palabras_reemplazo[-1] += palabras[i][fin+1:]
            for etiqueta, llaves in etiqueta_a_llaves.items():
                if llave in llaves:
                    etiquetas_reemplazo = [f"B-{etiqueta}"] + [f"I-{etiqueta}"] * (len(palabras_reemplazo) - 1)
                    break
            else:
                etiquetas_reemplazo = ["O" for _ in palabras_reemplazo]

            palabras = palabras[:i] + palabras_reemplazo + palabras[i+1:]
            etiquetas = etiquetas[:i] + etiquetas_reemplazo + etiquetas[i+1:]

        return palabras, etiquetas

    @staticmethod
    def clausula_plazo_variante() -> str:
        opciones = [
            "El mutuo tiene como plazo de vencimiento el día {plazo_fecha}, fecha en la que deberá pagarse íntegramente el capital e intereses adeudados.",
            "El plazo del presente contrato es de {plazo_dias} días, venciendo el {plazo_fecha}.",
            "El presente instrumento tendrá vigencia hasta el día {plazo_fecha}, en que expira el plazo pactado.",
            "La duración del contrato es de {plazo_dias} días corridos contados desde la fecha de suscripción, venciendo el {plazo_fecha}.",
            "La obligación asumida por el Deudor vence el día {plazo_fecha}, salvo prórroga conforme a la ley.",
            "La fecha de término del mutuo será el {plazo_fecha}, totalizando así {plazo_dias} días de plazo.",
            "Este contrato vencerá el {plazo_fecha}, considerándose en mora el Deudor a partir de esa fecha.",
            "El plazo para el pago íntegro del capital y los intereses estipulados expira el {plazo_fecha}.",
            "Las partes acuerdan que el vencimiento de la obligación será el día {plazo_fecha}.",
            "La vigencia del presente mutuo se extenderá hasta el {plazo_fecha}, sin posibilidad de prórroga automática.",
        ]
        return random.choice(opciones)
        
    @staticmethod
    def estructura_contrato_mutuo() -> Tuple[str, Dict[str, str]]:
        digits = "0123456789Kk"

        diccionario = dict(
            tipo_documento = "CONTRATO DE MUTUO Y MANDATO",

            # Datos aleatorios para deudor y corredor (empresas y representantes)
            deudor_empresa = fake.company().upper(),
            deudor_rut = f"{fake.random_int(60000000, 99999999)}-{random.choice(digits)}",
            deudor_representante = fake.name().upper(),
            deudor_ci = f"{fake.random_int(10000000, 29999999)}-{random.choice(digits)}",
            deudor_domicilio = f"{fake.street_address().upper()} {fake.city().upper()}, comuna de {fake.city().upper()}",

            corredor_empresa = fake.company().upper(),
            corredor_rut = f"{fake.random_int(20000000, 59999999)}-{random.choice(digits)}",
            corredor_representante = fake.name().upper(),
            corredor_ci = f"{fake.random_int(10000000, 29999999)}-{random.choice(digits)}",
            corredor_domicilio = f"{fake.street_address().upper()} {fake.city().upper()}, comuna de {fake.city().upper()}",

            fecha = f"{fake.day_of_month()} de {fake.month_name()} de {fake.year()}",

            capital = f"${fake.pyint(min_value=50000000, max_value=600000000, step=5000000):,}",
            tasa = str(round(random.uniform(0.08, 0.25), 3)),
            plazo_fecha = fake.date_between(start_date="+1m", end_date="+1y").strftime("%d de %B de %Y"),
            plazo_dias = str(random.choice([90, 120, 180, 270, 360, 365, 400, 720])),

            identificador = fake.lexify(text='??????'),
            nombre_titular = fake.company().upper(),
        )

        diccionario["firma_deudor"] = f"{diccionario['deudor_representante']}\n{diccionario['deudor_empresa']}"
        diccionario["firma_corredor"] = f"{diccionario['corredor_representante']}\n{diccionario['corredor_empresa']}"

        plantilla_contrato = """
{tipo_documento}

{deudor_empresa}
A
{corredor_empresa}

En Santiago, a {fecha}, entre:

A) {deudor_empresa}, Rol Único Tributario número {deudor_rut}, representada por {deudor_representante}, cédula de identidad número {deudor_ci}, todos con domicilio para estos efectos en {deudor_domicilio}, en adelante, indistintamente, el “Deudor”.

B) {corredor_empresa}, Rol Único Tributario número {corredor_rut}, representado por {corredor_representante}, cédula de identidad número {corredor_ci}, todos con domicilio para estos efectos en {corredor_domicilio}, en adelante el “Corredor”.

Todos denominados conjuntamente como las “Partes”, exponen que han convenido en suscribir el presente contrato de mutuo y mandato en los términos y condiciones de que dan cuenta las siguientes estipulaciones, en adelante el “Contrato”, cuyo identificador para efectos de su registro en Bolsa es “{identificador}”:

PRIMERO: DEFINICIONES.

Bolsa: Bolsa de Productos de Chile S.A.
Capital: Corresponde al monto adeudado indicado en el numeral 3.1.
Corredor: {corredor_empresa}.
Deudor: {deudor_empresa}.
Fecha de Vencimiento: {plazo_fecha}
Titular: {nombre_titular}
Intereses: Corresponde al interés indicado en el numeral 3.3 calculado sobre el Capital adeudado.
Ley: Ley N°19.220 que regula el establecimiento de bolsas de productos.

SEGUNDO: ANTECEDENTES.
...
(Se pueden agregar aquí más textos random, o repetir el estilo del original recortando/pegando secciones y agregando datos random.)

TERCERO: CARACTERÍSTICAS DEL MUTUO.

3.1 Capital: El monto del mutuo es {capital} moneda de curso legal en la República de Chile.

3.2 Plazo: """+EstructurasContrato.clausula_plazo_variante()+"""

3.3 Intereses: Desde la fecha del presente Contrato hasta la Fecha de Vencimiento, el Capital devengará una tasa de interés simple de {tasa}% mensual, calculada en base a 30 días.

3.4 Forma de Pago: Los pagos de Capital e Intereses previstos en el presente instrumento se efectuarán directamente a la Bolsa.

DÉCIMO TERCERO: FIRMA.

El presente instrumento se firma mediante el uso de firma electrónica avanzada con mecanismos que cumplen con las condiciones contempladas en la Ley N°19.799.

{firma_deudor}

{firma_corredor}
    """
        return plantilla_contrato, diccionario


    @staticmethod
    def estructura_1() -> Tuple[str, Dict[str, str]]:
        diccionario = EstructurasContrato.generar_diccionario_base()
        diccionario.update(
            tipo_documento="CONTRATO DE SERVICIO",
            monto=f"${fake.pyint(min_value=100000, max_value=5000000):,}".replace(",", "."),
            servicio=fake.sentence(nb_words=8),
            fecha=fake.date_this_decade().strftime("%d/%m/%Y"),
            parrafos="\n\n".join([fake.paragraph(nb_sentences=5) for _ in range(8)]),
        )
        plantilla_contrato = (
            "{tipo_documento}\n\n"
            "Se suscribe el presente contrato entre {nombre_persona} (RUT {rut_persona} ) con domicilio en {direccion} "
            "y la empresa {nombre_empresa} (RUT {rut_empresa} ).\n\n"
            "En la ciudad de Santiago, a {fecha}, se acuerda lo siguiente:\n"
            "Servicio: {servicio}\n"
            "Monto total: {monto}\n\n"
            "{parrafos}\n\n"
            "Firmas:\n\n{firma_persona}                   Representante de {firma_empresa}"
        )
        return plantilla_contrato, diccionario

    @staticmethod
    def estructura_2() -> Tuple[str, Dict[str, str]]:
        diccionario = EstructurasContrato.generar_diccionario_base()
        diccionario.update(
            tipo_documento="ACUERDO CONTRACTUAL",
            monto=f"${fake.pyint(min_value=500000, max_value=10000000):,}".replace(",", "."),
            servicio=fake.text(max_nb_chars=30),
            fecha=fake.date_this_year().strftime("%d/%m/%Y"),
            parrafos="\n".join([fake.paragraph(nb_sentences=3) for _ in range(5)]),
        )
        plantilla_contrato = (
            "{tipo_documento}\n\n"
            "Fecha: {fecha}\n"
            "El Sr./Sra. {nombre_persona} (RUT: {rut_persona} ), domiciliado en {direccion},\n"
            "acepta prestar servicios a la empresa {nombre_empresa}, cuyo RUT es {rut_empresa}.\n"
            "Servicio ofrecido: {servicio}\n"
            "El pago acordado es de {monto}.\n\n"
            "{parrafos}\n\n"
            "______________________________    ______________________________\n"
            "{firma_persona}                     {firma_empresa}"
        )
        return plantilla_contrato, diccionario

    @staticmethod
    def estructura_3() -> Tuple[str, Dict[str, str]]:
        diccionario = EstructurasContrato.generar_diccionario_base()
        diccionario.update(
            tipo_documento=f"CONTRATO N° {fake.random_int(min=1000, max=9999)}",
            monto=f"${fake.pyint(min_value=200000, max_value=3000000):,}".replace(",", "."),
            servicio=fake.sentence(nb_words=10),
            fecha=fake.date_this_century().strftime("%d/%m/%Y"),
            extra=fake.sentence(nb_words=12),
            parrafos="\n".join([fake.paragraph(nb_sentences=4) for _ in range(7)]),
        )
        plantilla_contrato = (
            "{tipo_documento}\n"
            "Fecha de emisión: {fecha}\n\n"
            "Comparecen por una parte {nombre_persona} (RUT {rut_persona} ), domiciliado en {direccion}, "
            "y por la otra parte la empresa {nombre_empresa}, RUT {rut_empresa}.\n\n"
            "{extra}\n"
            "Objeto del contrato: {servicio}\n"
            "Monto estipulado: {monto}\n\n"
            "{parrafos}\n\n"
            "FIRMAN:\n\n{firma_persona}\n{firma_persona}"
        )
        return plantilla_contrato, diccionario

    @staticmethod
    def estructura_4() -> Tuple[str, Dict[str, str]]:
        diccionario = EstructurasContrato.generar_diccionario_base()
        diccionario.update(
            tipo_documento="DOCUMENTO DE ACUERDO",
            monto=f"${fake.pyint(min_value=150000, max_value=8000000):,}".replace(",", "."),
            servicio=fake.sentence(nb_words=12),
            fecha=fake.date_this_year().strftime("%d/%m/%Y"),
            parrafos="\n".join([fake.paragraph(nb_sentences=2) for _ in range(6)]),
        )
        plantilla_contrato = (
            "{tipo_documento}\n"
            "Firmado en {fecha} entre {nombre_persona}, RUT {rut_persona}, domiciliado en {direccion}, "
            "y {nombre_empresa} (RUT {rut_empresa} ).\n"
            "El servicio pactado consiste en: {servicio}.\n"
            "El monto a cancelar será de {monto}.\n\n"
            "{parrafos}\n\n"
            "Firmado por:\n{firma_persona}\n{firma_empresa}"
        )
        return plantilla_contrato, diccionario

    @staticmethod
    def estructura_5() -> Tuple[str, Dict[str, str]]:
        diccionario = EstructurasContrato.generar_diccionario_base()
        diccionario.update(
            tipo_documento="CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES",
            monto=f"${fake.pyint(min_value=700000, max_value=9000000):,}".replace(",", "."),
            servicio=fake.sentence(nb_words=7),
            fecha=fake.date_this_decade().strftime("%d/%m/%Y"),
            clausulas="\n".join([f"Cláusula {i+1}: {fake.sentence(nb_words=15)}" for i in range(5)]),
        )
        plantilla_contrato = (
            "{tipo_documento}\n"
            "Entre {nombre_persona} (RUT {rut_persona} ) y {nombre_empresa} (RUT {rut_empresa} ).\n"
            "Fecha: {fecha}\n\n"
            "Servicio contratado: {servicio}\n"
            "Monto: {monto}\n\n"
            "{clausulas}\n\n"
            "Firmas:\n{firma_persona} / {firma_empresa}"
        )
        return plantilla_contrato, diccionario

    @staticmethod
    def estructura_6() -> Tuple[str, Dict[str, str]]:
        diccionario = EstructurasContrato.generar_diccionario_base()
        diccionario.update(
            tipo_documento="CONTRATO SIMPLE",
            monto=f"${fake.pyint(min_value=300000, max_value=2000000):,}".replace(",", "."),
            servicio=fake.text(max_nb_chars=50),
            fecha=fake.date_between(start_date='-5y', end_date='today').strftime("%d/%m/%Y"),
            observaciones=fake.paragraph(nb_sentences=2),
        )
        plantilla_contrato = (
            "{tipo_documento}\n"
            "{nombre_persona} (RUT: {rut_persona} ) acuerda prestar servicios para {nombre_empresa} (RUT: {rut_empresa} ).\n"
            "Dirección: {direccion}\n"
            "Fecha de inicio: {fecha}\n"
            "Descripción del servicio: {servicio}\n"
            "Monto acordado: {monto}\n"
            "Observaciones: {observaciones}\n"
            "Firmas: ____________________   ____________________"
        )
        return plantilla_contrato, diccionario

    @staticmethod
    def estructura_7() -> Tuple[str, Dict[str, str]]:
        diccionario = EstructurasContrato.generar_diccionario_base()
        diccionario.update(
            tipo_documento="ACTA DE COMPROMISO",
            monto=f"${fake.pyint(min_value=1000000, max_value=20000000):,}".replace(",", "."),
            servicio=fake.bs().capitalize(),
            fecha=fake.date_this_decade().strftime("%d/%m/%Y"),
            detalles="\n".join([f"- {fake.sentence(nb_words=10)}" for _ in range(4)]),
        )
        plantilla_contrato = (
            "{tipo_documento}\n"
            "Por este acto, {nombre_persona} (RUT {rut_persona} ), domiciliado en {direccion},\n"
            "y {nombre_empresa} (RUT {rut_empresa} ) acuerdan lo siguiente:\n"
            "Fecha: {fecha}\n"
            "Servicio: {servicio}\n"
            "Monto total: {monto}\n"
            "Detalles:\n{detalles}\n"
            "Firmado electrónicamente."
        )
        return plantilla_contrato, diccionario

    @staticmethod
    def estructura_8() -> Tuple[str, Dict[str, str]]:
        diccionario = EstructurasContrato.generar_diccionario_base()
        diccionario.update(
            tipo_documento="CONTRATO ESPECIAL",
            monto=f"${fake.pyint(min_value=250000, max_value=10000000):,}".replace(",", "."),
            servicio=fake.catch_phrase(),
            fecha=fake.date_this_year().strftime("%d/%m/%Y"),
            clausulas="\n".join([f"{i+1}. {fake.sentence(nb_words=12)}" for i in range(6)]),
        )
        plantilla_contrato = (
            "{tipo_documento}\n"
            "En la fecha {fecha}, se acuerda entre {nombre_persona} (RUT {rut_persona} ), "
            "con domicilio en {direccion}, y la empresa {nombre_empresa} (RUT {rut_empresa} ) la prestación del siguiente servicio:\n"
            "{servicio}\n"
            "Por un monto de: {monto}\n"
            "Cláusulas:\n{clausulas}\n"
            "Firmas:\n{firma_persona} / {firma_empresa}"
        )
        return plantilla_contrato, diccionario

    @staticmethod
    def estructura_9() -> Tuple[str, Dict[str, str]]:
        diccionario = EstructurasContrato.generar_diccionario_base()
        diccionario.update(
            tipo_documento="FORMULARIO DE CONTRATO",
            monto=f"${fake.pyint(min_value=400000, max_value=15000000):,}".replace(",", "."),
            servicio=fake.text(max_nb_chars=60),
            fecha=fake.date_this_century().strftime("%d/%m/%Y"),
            parrafos="\n".join([fake.paragraph(nb_sentences=3) for _ in range(4)]),
        )
        plantilla_contrato = (
            "{tipo_documento}\n"
            "Entre {nombre_persona} (RUT: {rut_persona}, dirección: {direccion}) "
            "y {nombre_empresa} (RUT: {rut_empresa} ), en fecha {fecha}.\n"
            "Servicio: {servicio}\n"
            "Monto: {monto}\n\n"
            "{parrafos}\n"
            "Firmas:\n{firma_persona}\n{firma_empresa}"
        )
        return plantilla_contrato, diccionario

    @staticmethod
    def estructura_10() -> Tuple[str, Dict[str, str]]:
        diccionario = EstructurasContrato.generar_diccionario_base()
        diccionario.update(
            tipo_documento="CONTRATO INDIVIDUAL",
            monto=f"${fake.pyint(min_value=350000, max_value=12000000):,}".replace(",", "."),
            servicio=fake.job(),
            fecha=fake.date_between(start_date='-3y', end_date='today').strftime("%d/%m/%Y"),
            condiciones="\n".join([f"{i+1}) {fake.sentence(nb_words=10)}" for i in range(5)]),
        )
        plantilla_contrato = (
            "{tipo_documento}\n"
            "Suscrito en {fecha} entre {nombre_persona}, RUT {rut_persona}, domiciliado en {direccion}, "
            "y la empresa {nombre_empresa} (RUT {rut_empresa} ).\n"
            "Servicio profesional: {servicio}\n"
            "Monto pactado: {monto}\n"
            "Condiciones:\n{condiciones}\n"
            "________________________\n"
            "{firma_persona}        {firma_empresa}"
        )
        return plantilla_contrato, diccionario

    @staticmethod
    def random_structure() -> Tuple[str, str]:
        estructuras: List[Callable[[], Tuple[str, str]]] = [
            EstructurasContrato.estructura_contrato_mutuo,
            EstructurasContrato.estructura_1,
            EstructurasContrato.estructura_2,
            EstructurasContrato.estructura_3,
            EstructurasContrato.estructura_4,
            EstructurasContrato.estructura_5,
            EstructurasContrato.estructura_6,
            EstructurasContrato.estructura_7,
            EstructurasContrato.estructura_8,
            EstructurasContrato.estructura_9,
            EstructurasContrato.estructura_10,
        ]
        return random.choice(estructuras)()
