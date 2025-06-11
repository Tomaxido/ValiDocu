from typing import Tuple, Callable, List
from faker import Faker
import random

fake = Faker('es_CL')

class EstructurasContrato():
    @staticmethod
    def generar_rut() -> str:
        numero = fake.random_int(min=10000000, max=25000000)
        dv = fake.random_element(elements=['K', 'k', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
        return f"{numero}-{dv}"

    @staticmethod
    def generar_nombre_empresa() -> str:
        return fake.company()

    def clausula_plazo_variante(plazo_fecha: str, plazo_dias: int) -> str:
        opciones = [
            f"El mutuo tiene como plazo de vencimiento el día {plazo_fecha}, fecha en la que deberá pagarse íntegramente el capital e intereses adeudados.",
            f"El plazo del presente contrato es de {plazo_dias} días, venciendo el {plazo_fecha}.",
            f"El presente instrumento tendrá vigencia hasta el día {plazo_fecha}, en que expira el plazo pactado.",
            f"La duración del contrato es de {plazo_dias} días corridos contados desde la fecha de suscripción, venciendo el {plazo_fecha}.",
            f"La obligación asumida por el Deudor vence el día {plazo_fecha}, salvo prórroga conforme a la ley.",
            f"La fecha de término del mutuo será el {plazo_fecha}, totalizando así {plazo_dias} días de plazo.",
            f"Este contrato vencerá el {plazo_fecha}, considerándose en mora el Deudor a partir de esa fecha.",
            f"El plazo para el pago íntegro del capital y los intereses estipulados expira el {plazo_fecha}.",
            f"Las partes acuerdan que el vencimiento de la obligación será el día {plazo_fecha}.",
            f"La vigencia del presente mutuo se extenderá hasta el {plazo_fecha}, sin posibilidad de prórroga automática.",
        ]
        return random.choice(opciones)
        
    @staticmethod
    def estructura_contrato_mutuo() -> Tuple[str, str]:
        # Datos aleatorios para deudor y corredor (empresas y representantes)
        deudor_empresa = fake.company().upper()
        deudor_rut = f"{fake.random_int(60000000, 99999999)}-{random.choice(['0','1','2','3','4','5','6','7','8','9','K','k'])}"
        deudor_representante = fake.name().upper()
        deudor_ci = f"{fake.random_int(10000000, 29999999)}-{random.choice(['0','1','2','3','4','5','6','7','8','9','K','k'])}"
        deudor_domicilio = f"{fake.street_address().upper()} {fake.city().upper()}, comuna de {fake.city().upper()}"

        corredor_empresa = fake.company().upper()
        corredor_rut = f"{fake.random_int(20000000, 59999999)}-{random.choice(['0','1','2','3','4','5','6','7','8','9','K','k'])}"
        corredor_representante = fake.name().upper()
        corredor_ci = f"{fake.random_int(10000000, 29999999)}-{random.choice(['0','1','2','3','4','5','6','7','8','9','K','k'])}"
        corredor_domicilio = f"{fake.street_address().upper()} {fake.city().upper()}, comuna de {fake.city().upper()}"

        fecha_dia = fake.day_of_month()
        fecha_mes = fake.month_name()
        fecha_anio = fake.year()

        capital = fake.pyint(min_value=50000000, max_value=600000000, step=5000000)
        tasa = round(random.uniform(0.08, 0.25), 3)
        plazo_fecha = fake.date_between(start_date="+1m", end_date="+1y").strftime("%d de %B de %Y")
        plazo_dias = random.choice([90, 120, 180, 270, 360, 365, 400, 720])

        identificador = fake.lexify(text='??????')
        nombre_titular = fake.company().upper()

        contrato = f"""
CONTRATO DE MUTUO Y MANDATO

{deudor_empresa}
A
{corredor_empresa}

En Santiago, a {fecha_dia} de {fecha_mes} de {fecha_anio}, entre:

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

3.1 Capital: El monto del mutuo es ${capital:,} moneda de curso legal en la República de Chile.

3.2 Plazo: {EstructurasContrato.clausula_plazo_variante(plazo_fecha, plazo_dias)}

3.3 Intereses: Desde la fecha del presente Contrato hasta la Fecha de Vencimiento, el Capital devengará una tasa de interés simple de {tasa}% mensual, calculada en base a 30 días.

3.4 Forma de Pago: Los pagos de Capital e Intereses previstos en el presente instrumento se efectuarán directamente a la Bolsa.

DÉCIMO TERCERO: FIRMA.

El presente instrumento se firma mediante el uso de firma electrónica avanzada con mecanismos que cumplen con las condiciones contempladas en la Ley N°19.799.

{deudor_representante}
{deudor_empresa}

{corredor_representante}
{corredor_empresa}
    """
        return contrato, deudor_empresa


    @staticmethod
    def estructura_1() -> Tuple[str, str]:
        nombre_persona = fake.name()
        rut_persona = EstructurasContrato.generar_rut()
        direccion = fake.address().replace('\n', ', ')
        nombre_empresa = EstructurasContrato.generar_nombre_empresa()
        rut_empresa = EstructurasContrato.generar_rut()
        monto = f"${fake.pyint(min_value=100000, max_value=5000000):,}".replace(",", ".")
        servicio = fake.sentence(nb_words=8)
        fecha = fake.date_this_decade().strftime("%d/%m/%Y")
        parrafos = "\n\n".join([fake.paragraph(nb_sentences=5) for _ in range(8)])
        contrato = (
            f"CONTRATO DE SERVICIO\n\n"
            f"Se suscribe el presente contrato entre {nombre_persona} (RUT {rut_persona}) con domicilio en {direccion} "
            f"y la empresa {nombre_empresa} (RUT {rut_empresa}).\n\n"
            f"En la ciudad de Santiago, a {fecha}, se acuerda lo siguiente:\n"
            f"Servicio: {servicio}\n"
            f"Monto total: {monto}\n\n"
            f"{parrafos}\n\n"
            f"Firmas:\n\n{nombre_persona}                   Representante de {nombre_empresa}"
        )
        return contrato, nombre_persona

    @staticmethod
    def estructura_2() -> Tuple[str, str]:
        nombre_persona = fake.name()
        rut_persona = EstructurasContrato.generar_rut()
        direccion = fake.address().replace('\n', ', ')
        nombre_empresa = EstructurasContrato.generar_nombre_empresa()
        rut_empresa = EstructurasContrato.generar_rut()
        monto = f"${fake.pyint(min_value=500000, max_value=10000000):,}".replace(",", ".")
        servicio = fake.text(max_nb_chars=30)
        fecha = fake.date_this_year().strftime("%d/%m/%Y")
        parrafos = "\n".join([fake.paragraph(nb_sentences=3) for _ in range(5)])
        contrato = (
            f"ACUERDO CONTRACTUAL\n\n"
            f"Fecha: {fecha}\n"
            f"El Sr./Sra. {nombre_persona} (RUT: {rut_persona}), domiciliado en {direccion},\n"
            f"acepta prestar servicios a la empresa {nombre_empresa}, cuyo RUT es {rut_empresa}.\n"
            f"Servicio ofrecido: {servicio}\n"
            f"El pago acordado es de {monto}.\n\n"
            f"{parrafos}\n\n"
            f"______________________________    ______________________________\n"
            f"{nombre_persona}                     {nombre_empresa}"
        )
        return contrato, nombre_persona

    @staticmethod
    def estructura_3() -> Tuple[str, str]:
        nombre_persona = fake.name()
        rut_persona = EstructurasContrato.generar_rut()
        direccion = fake.address().replace('\n', ', ')
        nombre_empresa = EstructurasContrato.generar_nombre_empresa()
        rut_empresa = EstructurasContrato.generar_rut()
        monto = f"${fake.pyint(min_value=200000, max_value=3000000):,}".replace(",", ".")
        servicio = fake.sentence(nb_words=10)
        fecha = fake.date_this_century().strftime("%d/%m/%Y")
        extra = fake.sentence(nb_words=12)
        parrafos = "\n".join([fake.paragraph(nb_sentences=4) for _ in range(7)])
        contrato = (
            f"CONTRATO N° {fake.random_int(min=1000, max=9999)}\n"
            f"Fecha de emisión: {fecha}\n\n"
            f"Comparecen por una parte {nombre_persona} (RUT {rut_persona}), domiciliado en {direccion}, "
            f"y por la otra parte la empresa {nombre_empresa}, RUT {rut_empresa}.\n\n"
            f"{extra}\n"
            f"Objeto del contrato: {servicio}\n"
            f"Monto estipulado: {monto}\n\n"
            f"{parrafos}\n\n"
            f"FIRMAN:\n\n{nombre_persona}\n{nombre_empresa} ({rut_empresa})"
        )
        return contrato, nombre_persona

    @staticmethod
    def estructura_4() -> Tuple[str, str]:
        nombre_persona = fake.name()
        rut_persona = EstructurasContrato.generar_rut()
        direccion = fake.address().replace('\n', ', ')
        nombre_empresa = EstructurasContrato.generar_nombre_empresa()
        rut_empresa = EstructurasContrato.generar_rut()
        monto = f"${fake.pyint(min_value=150000, max_value=8000000):,}".replace(",", ".")
        servicio = fake.sentence(nb_words=12)
        fecha = fake.date_this_year().strftime("%d/%m/%Y")
        parrafos = "\n".join([fake.paragraph(nb_sentences=2) for _ in range(6)])
        contrato = (
            f"DOCUMENTO DE ACUERDO\n"
            f"Firmado en {fecha} entre {nombre_persona}, RUT {rut_persona}, domiciliado en {direccion}, "
            f"y {nombre_empresa} (RUT {rut_empresa}).\n"
            f"El servicio pactado consiste en: {servicio}.\n"
            f"El monto a cancelar será de {monto}.\n\n"
            f"{parrafos}\n\n"
            f"Firmado por:\n{nombre_persona}\n{nombre_empresa}"
        )
        return contrato, nombre_persona

    @staticmethod
    def estructura_5() -> Tuple[str, str]:
        nombre_persona = fake.name()
        rut_persona = EstructurasContrato.generar_rut()
        direccion = fake.address().replace('\n', ', ')
        nombre_empresa = EstructurasContrato.generar_nombre_empresa()
        rut_empresa = EstructurasContrato.generar_rut()
        monto = f"${fake.pyint(min_value=700000, max_value=9000000):,}".replace(",", ".")
        servicio = fake.sentence(nb_words=7)
        fecha = fake.date_this_decade().strftime("%d/%m/%Y")
        clausulas = "\n".join([f"Cláusula {i+1}: {fake.sentence(nb_words=15)}" for i in range(5)])
        contrato = (
            f"CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES\n"
            f"Entre {nombre_persona} (RUT {rut_persona}) y {nombre_empresa} (RUT {rut_empresa}).\n"
            f"Fecha: {fecha}\n\n"
            f"Servicio contratado: {servicio}\n"
            f"Monto: {monto}\n\n"
            f"{clausulas}\n\n"
            f"Firmas:\n{nombre_persona} / {nombre_empresa}"
        )
        return contrato, nombre_persona

    @staticmethod
    def estructura_6() -> Tuple[str, str]:
        nombre_persona = fake.name()
        rut_persona = EstructurasContrato.generar_rut()
        direccion = fake.address().replace('\n', ', ')
        nombre_empresa = EstructurasContrato.generar_nombre_empresa()
        rut_empresa = EstructurasContrato.generar_rut()
        monto = f"${fake.pyint(min_value=300000, max_value=2000000):,}".replace(",", ".")
        servicio = fake.text(max_nb_chars=50)
        fecha = fake.date_between(start_date='-5y', end_date='today').strftime("%d/%m/%Y")
        observaciones = fake.paragraph(nb_sentences=2)
        contrato = (
            f"CONTRATO SIMPLE\n"
            f"{nombre_persona} (RUT: {rut_persona}) acuerda prestar servicios para {nombre_empresa} (RUT: {rut_empresa}).\n"
            f"Dirección: {direccion}\n"
            f"Fecha de inicio: {fecha}\n"
            f"Descripción del servicio: {servicio}\n"
            f"Monto acordado: {monto}\n"
            f"Observaciones: {observaciones}\n"
            f"Firmas: ____________________   ____________________"
        )
        return contrato, nombre_persona

    @staticmethod
    def estructura_7() -> Tuple[str, str]:
        nombre_persona = fake.name()
        rut_persona = EstructurasContrato.generar_rut()
        direccion = fake.address().replace('\n', ', ')
        nombre_empresa = EstructurasContrato.generar_nombre_empresa()
        rut_empresa = EstructurasContrato.generar_rut()
        monto = f"${fake.pyint(min_value=1000000, max_value=20000000):,}".replace(",", ".")
        servicio = fake.bs().capitalize()
        fecha = fake.date_this_decade().strftime("%d/%m/%Y")
        detalles = "\n".join([f"- {fake.sentence(nb_words=10)}" for _ in range(4)])
        contrato = (
            f"ACTA DE COMPROMISO\n"
            f"Por este acto, {nombre_persona} (RUT {rut_persona}), domiciliado en {direccion},\n"
            f"y {nombre_empresa} (RUT {rut_empresa}) acuerdan lo siguiente:\n"
            f"Fecha: {fecha}\n"
            f"Servicio: {servicio}\n"
            f"Monto total: {monto}\n"
            f"Detalles:\n{detalles}\n"
            f"Firmado electrónicamente."
        )
        return contrato, nombre_persona

    @staticmethod
    def estructura_8() -> Tuple[str, str]:
        nombre_persona = fake.name()
        rut_persona = EstructurasContrato.generar_rut()
        direccion = fake.address().replace('\n', ', ')
        nombre_empresa = EstructurasContrato.generar_nombre_empresa()
        rut_empresa = EstructurasContrato.generar_rut()
        monto = f"${fake.pyint(min_value=250000, max_value=10000000):,}".replace(",", ".")
        servicio = fake.catch_phrase()
        fecha = fake.date_this_year().strftime("%d/%m/%Y")
        clausulas = "\n".join([f"{i+1}. {fake.sentence(nb_words=12)}" for i in range(6)])
        contrato = (
            f"CONTRATO ESPECIAL\n"
            f"En la fecha {fecha}, se acuerda entre {nombre_persona} (RUT {rut_persona}), "
            f"con domicilio en {direccion}, y la empresa {nombre_empresa} (RUT {rut_empresa}) la prestación del siguiente servicio:\n"
            f"{servicio}\n"
            f"Por un monto de: {monto}\n"
            f"Cláusulas:\n{clausulas}\n"
            f"Firmas:\n{nombre_persona} / {nombre_empresa}"
        )
        return contrato, nombre_persona

    @staticmethod
    def estructura_9() -> Tuple[str, str]:
        nombre_persona = fake.name()
        rut_persona = EstructurasContrato.generar_rut()
        direccion = fake.address().replace('\n', ', ')
        nombre_empresa = EstructurasContrato.generar_nombre_empresa()
        rut_empresa = EstructurasContrato.generar_rut()
        monto = f"${fake.pyint(min_value=400000, max_value=15000000):,}".replace(",", ".")
        servicio = fake.text(max_nb_chars=60)
        fecha = fake.date_this_century().strftime("%d/%m/%Y")
        parrafos = "\n".join([fake.paragraph(nb_sentences=3) for _ in range(4)])
        contrato = (
            f"FORMULARIO DE CONTRATO\n"
            f"Entre {nombre_persona} (RUT: {rut_persona}, dirección: {direccion}) "
            f"y {nombre_empresa} (RUT: {rut_empresa}), en fecha {fecha}.\n"
            f"Servicio: {servicio}\n"
            f"Monto: {monto}\n\n"
            f"{parrafos}\n"
            f"Firmas:\n{nombre_persona}\n{nombre_empresa}"
        )
        return contrato, nombre_persona

    @staticmethod
    def estructura_10() -> Tuple[str, str]:
        nombre_persona = fake.name()
        rut_persona = EstructurasContrato.generar_rut()
        direccion = fake.address().replace('\n', ', ')
        nombre_empresa = EstructurasContrato.generar_nombre_empresa()
        rut_empresa = EstructurasContrato.generar_rut()
        monto = f"${fake.pyint(min_value=350000, max_value=12000000):,}".replace(",", ".")
        servicio = fake.job()
        fecha = fake.date_between(start_date='-3y', end_date='today').strftime("%d/%m/%Y")
        condiciones = "\n".join([f"{i+1}) {fake.sentence(nb_words=10)}" for i in range(5)])
        contrato = (
            f"CONTRATO INDIVIDUAL\n"
            f"Suscrito en {fecha} entre {nombre_persona}, RUT {rut_persona}, domiciliado en {direccion}, "
            f"y la empresa {nombre_empresa} (RUT {rut_empresa}).\n"
            f"Servicio profesional: {servicio}\n"
            f"Monto pactado: {monto}\n"
            f"Condiciones:\n{condiciones}\n"
            f"________________________\n"
            f"{nombre_persona}        {nombre_empresa}"
        )
        return contrato, nombre_persona

    @staticmethod
    def random_structure() -> Tuple[str, str]:
        estructuras: List[Callable[[], Tuple[str, str]]] = [
            EstructurasContrato.estructura_contrato_mutuo,
            # EstructurasContrato.estructura_1,
            # EstructurasContrato.estructura_2,
            # EstructurasContrato.estructura_3,
            # EstructurasContrato.estructura_4,
            # EstructurasContrato.estructura_5,
            # EstructurasContrato.estructura_6,
            # EstructurasContrato.estructura_7,
            # EstructurasContrato.estructura_8,
            # EstructurasContrato.estructura_9,
            # EstructurasContrato.estructura_10,
        ]
        return random.choice(estructuras)()
