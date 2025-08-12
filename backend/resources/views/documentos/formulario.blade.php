<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Subir Documentos</title>
</head>
<body>
    <h1>Subir Documentos</h1>

    @if (session('success'))
        <p style="color: green">{{ session('success') }}</p>
    @endif

    <form action="{{ url('/documentos/documents') }}" method="POST" enctype="multipart/form-data">
        @csrf

        <label for="group_name">Nombre del grupo:</label><br>
        <input type="text" name="group_name" required><br><br>

        <label for="documents">Selecciona archivos (puedes subir varios):</label><br>
        <input type="file" name="documents[]" multiple required><br><br>

        <button type="submit">Subir</button>
    </form>
</body>
</html>
