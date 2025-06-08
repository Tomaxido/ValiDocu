<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Documentos Subidos</title>
</head>
<body>
    <h1>Grupos de Documentos</h1>

    @foreach ($grupos as $grupo)
        <h3>{{ $grupo->name }} (Estado: {{ $grupo->status }})</h3>
        <ul>
            @foreach ($grupo->documents as $doc)
                <li>
                    <a href="{{ Storage::url($doc->filepath) }}" target="_blank">{{ $doc->filename }}</a>
                    - Estado: {{ $doc->status }}
                </li>
            @endforeach
        </ul>
        <hr>
    @endforeach
</body>
</html>
