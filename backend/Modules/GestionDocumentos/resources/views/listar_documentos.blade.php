<!DOCTYPE html>
<html>
<head><title>Listar Documento</title></head>
<body>
    <h1>Lista de PDFs</h1>
    @if(session('success'))
        <p style="color: green;">{{ session('success') }}</p>
    @endif

    <table border="1">
        <thead>
            <tr>
                <th>nombre_original</th>
                <th>ruta</th>
                <th>tipo</th>
            </tr>
        </thead>
        <tbody>
            @foreach($documentos as $documento)
                <tr>
                    <td>{{ $documento->nombre_original }}</td>
                    <td>{{ $documento->path }}</td>
                    <td>{{ $documento->tipo }}</td>
                </tr>
            @endforeach
        </tbody>

    {{-- <form action="{{ url('documentos/subir') }}" method="POST" enctype="multipart/form-data">
        @csrf
        <input type="file" name="documento" accept="application/pdf">
        <button type="submit">Subir</button>
    </form> --}}
</body>
</html>
