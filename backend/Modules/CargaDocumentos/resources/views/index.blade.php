<!DOCTYPE html>
<html>
<head><title>Subir Documento</title></head>
<body>
    <h1>Subir PetoDF</h1>
    @if(session('success'))
        <p style="color: green;">{{ session('success') }}</p>
    @endif
    <form action="{{ url('documentos/subir') }}" method="POST" enctype="multipart/form-data">
        @csrf
        <input type="file" name="documento" accept="application/pdf">
        <button type="submit">Subir</button>
    </form>
</body>
</html>
