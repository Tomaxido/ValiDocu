<?php

namespace App\Services;

use DOMDocument;
use DOMXPath;
use GuzzleHttp\Client;

class SiiService
{
    public function checkDte($rut, $dv): array
    {
        $this->validarCampos($rut, $dv);
        if (!$this->validarRut($rut . $dv)) {
            throw new \Exception("El RUT es inválido.");
        }

        $client = new Client();

        try {
            $res = $client->post('https://zeus.sii.cl/cvc_cgi/stc/CViewCaptcha.cgi', [
                'form_params' => [
                    'oper' => 0,
                ]
            ]);
        } catch (\Throwable $th) {
            throw new \Exception("Error al contactar SII.");
        }

        $data = json_decode($res->getBody());
        $captcha = $data->txtCaptcha;
        $code = substr(base64_decode($captcha), 36, 4);

        $res = $client->post('https://zeus.sii.cl/cvc_cgi/stc/getstc', [
            'form_params' => [
                'RUT' => $rut,
                'DV' => $dv,
                'PRG' => 'STC',
                'OPC' => 'NOR',
                'txt_code' => $code,
                'txt_captcha' => $captcha
            ]
        ]);

        $html = (string) $res->getBody();

        $html = (string) $res->getBody();
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);

        return $this->parsearDatosDesdeHtml($xpath, $rut, $dv);
    }

    private function validarRut($rut)
    {
        $rut = preg_replace('/[^k0-9]/i', '', $rut);
        $dv = substr($rut, -1);
        $numero = substr($rut, 0, strlen($rut) - 1);
        $i = 2;
        $suma = 0;

        foreach (array_reverse(str_split($numero)) as $v) {
            if ($i == 8) $i = 2;
            $suma += $v * $i++;
        }

        $dvr = 11 - ($suma % 11);
        $dvr = $dvr == 11 ? 0 : ($dvr == 10 ? 'K' : $dvr);

        return strtoupper($dv) == $dvr;
    }

    private function validarCampos($rut, $dv)
    {
        $errores = [];
        if (!$rut) $errores['rut'] = 'El campo rut es obligatorio.';
        if (!$dv) $errores['dv'] = 'El campo dv es obligatorio.';
        if (!empty($errores)) {
            throw new \Exception(json_encode($errores));
        }
    }

    private function parsearDatosDesdeHtml(DOMXPath $xpath, $rut, $dv): array
    {
        try{
            $razon_social = "";
            $fail = false;
            $errors = [];

            $nodes = $xpath->query('/html/body/div/div[4]');
            $razon_social = trim($nodes[0]->childNodes[0]->nodeValue);

            $nodes = $xpath->query('/html/body/div/div[6]');
            $rut = $nodes[0]->childNodes[0]->nodeValue;

        }catch (\Throwable $th) {
            $fail = true;
            $errors[] = 'Marcar inicio de actividades.';
        }

        $inicio_de_actividades = false;
        try{
            $nodes = $xpath->query('/html/body/div/span[2]');
            $inicio_de_actividades = $nodes[0]->childNodes[0]->nodeValue;
            $inicio_de_actividades = str_replace("\r\n","",$inicio_de_actividades);
            $inicio_de_actividades = str_replace("\n","",$inicio_de_actividades);
            $inicio_de_actividades = str_replace("\r","",$inicio_de_actividades);

            $inicio_de_actividades = substr($inicio_de_actividades, -2);

            if ($inicio_de_actividades == "SI"){
                $inicio_de_actividades = true;
            } elseif ($inicio_de_actividades == "NO"){
                $inicio_de_actividades = false;
            } else {
                $inicio_de_actividades = false;
            }
        }catch (\Throwable $th) {
            $fail = true;
            $errors[] = 'Marcar inicio de actividades.';
        }

        if($inicio_de_actividades){
            $nodes = $xpath->query('/html/body/div/span[3]');
            $inicio_de_actividades_date = $nodes[0]->childNodes[0]->nodeValue;
            $inicio_de_actividades_date = substr($inicio_de_actividades_date, -10);

            try{
                $nodes = $xpath->query('/html/body/div/table[1]/tr');
                $actividades = [];

                $i = 0;
                foreach ($nodes as $node) {
                    if ($i == 0)
                    {
                      $i++;
                      continue;
                    }

                    $glosaNode = $xpath->query('./td[1]/font', $node);
                    $glosa = ($glosaNode->length > 0) ? trim($glosaNode[0]->nodeValue) : '';

                    $codigoNode = $xpath->query('./td[2]/font', $node);
                    $codigo = ($codigoNode->length > 0) ? trim($codigoNode[0]->nodeValue) : '';

                    $categoriaNode = $xpath->query('./td[3]/font', $node);
                    $categoria = ($categoriaNode->length > 0) ? trim($categoriaNode[0]->nodeValue) : '';

                    if ($categoria == 'Primera'){
                        $categoria = 1;
                    } elseif ($categoria == 'Segunda'){
                        $categoria = 2;
                    }

                    $afectaNode = $xpath->query('./td[4]/font', $node);
                    $afecta = ($categoriaNode->length > 0) ? trim($afectaNode[0]->nodeValue) : '';

                    $fechaNode = $xpath->query('./td[5]/font', $node);
                    $fecha = ($categoriaNode->length > 0) ? trim($fechaNode[0]->nodeValue) : '';

                    $data = [
                        'glosa' => $glosa,
                        'codigo' => $codigo,
                        'categoria' => $categoria,
                        'afecta' => $afecta,
                        'fecha' =>  $fecha
                    ];

                    $actividades[] = $data;
                }

            }catch (\Throwable $th) {
                $fail = true;
                $errors[] = 'Obtener inicio de actividades.';
            }

            try{
                $nodes = $xpath->query('/html/body/div/table[3]/tr');
                $documentos_timbrados = [];

                $i = 0;
                foreach ($nodes as $node) {
                    if ($i == 0)
                    {
                      $i++;
                      continue;
                    }

                    $documentoNode = $xpath->query('./td[1]/font', $node);
                    $documento = ($categoriaNode->length > 0) ? trim($documentoNode[0]->nodeValue) : '';

                    $ultimo_timbrajeNode = $xpath->query('./td[2]/font', $node);
                    $ultimo_timbraje = ($categoriaNode->length > 0) ? trim($ultimo_timbrajeNode[0]->nodeValue) : '';

                    $data = [
                        'documento' => $documento,
                        'ultimo_timbraje' => $ultimo_timbraje,
                    ];

                    $documentos_timbrados[] = $data;
                }

            }catch (\Throwable $th) {
                $fail = true;
                $errors[] = 'Obtener documentos timbrados.';
            }

            $impuestos_moneda_extranjera = false;
            try{
                $nodes = $xpath->query('/html/body/div/span[5]');
                $impuestos_moneda_extranjera = $nodes[0]->childNodes[0]->nodeValue;
                $impuestos_moneda_extranjera = str_replace("\r\n","",$impuestos_moneda_extranjera);
                $impuestos_moneda_extranjera = str_replace("\n","",$impuestos_moneda_extranjera);
                $impuestos_moneda_extranjera = str_replace("\r","",$impuestos_moneda_extranjera);

                $impuestos_moneda_extranjera = substr($impuestos_moneda_extranjera, -2);

                if ($impuestos_moneda_extranjera == "SI"){
                    $impuestos_moneda_extranjera = true;
                } elseif ($impuestos_moneda_extranjera == "NO"){
                    $impuestos_moneda_extranjera = false;
                } else {
                    $impuestos_moneda_extranjera = false;
                }
            }catch (\Throwable $th) {
                $fail = true;
                $errors[] = 'Impuestos sobre moneda extranjera.';
            }

            $empresa_de_menor_tamano = false;
            try{
                $nodes = $xpath->query('/html/body/div/span[5]');
                $empresa_de_menor_tamano = $nodes[0]->childNodes[2]->nodeValue;
                $empresa_de_menor_tamano = str_replace("\r\n","",$empresa_de_menor_tamano);
                $empresa_de_menor_tamano = str_replace("\n","",$empresa_de_menor_tamano);
                $empresa_de_menor_tamano = str_replace("\r","",$empresa_de_menor_tamano);

                $empresa_de_menor_tamano = substr($empresa_de_menor_tamano, -2);

                if ($empresa_de_menor_tamano == "SI"){
                    $empresa_de_menor_tamano = true;
                } elseif ($empresa_de_menor_tamano == "NO"){
                    $empresa_de_menor_tamano = false;
                } else {
                    $empresa_de_menor_tamano = false;
                }
            }catch (\Throwable $th) {
                $fail = true;
                $errors[] = 'Empresa de menor tamaño.';
            }

        }else{

            $impuestos_moneda_extranjera = false;
            try{
                $nodes = $xpath->query('/html/body/div/span[3]');
                $impuestos_moneda_extranjera = $nodes[0]->childNodes[0]->nodeValue;
                $impuestos_moneda_extranjera = str_replace("\r\n","",$impuestos_moneda_extranjera);
                $impuestos_moneda_extranjera = str_replace("\n","",$impuestos_moneda_extranjera);
                $impuestos_moneda_extranjera = str_replace("\r","",$impuestos_moneda_extranjera);

                $impuestos_moneda_extranjera = substr($impuestos_moneda_extranjera, -2);

                if ($impuestos_moneda_extranjera == "SI"){
                    $impuestos_moneda_extranjera = true;
                } elseif($impuestos_moneda_extranjera == "NO"){
                    $impuestos_moneda_extranjera = false;
                } else {
                    $impuestos_moneda_extranjera = false;
                }
            }catch (\Throwable $th) {
                $fail = true;
                $errors[] = 'Impuesto en moneda extranjera (sin inicio de actividades)';
            }

            $empresa_de_menor_tamano = false;
            try{
                $nodes = $xpath->query('/html/body/div/span[4]');
                $empresa_de_menor_tamano = $nodes[0]->childNodes[2]->nodeValue;
                $empresa_de_menor_tamano = str_replace("\r\n","",$empresa_de_menor_tamano);
                $empresa_de_menor_tamano = str_replace("\n","",$empresa_de_menor_tamano);
                $empresa_de_menor_tamano = str_replace("\r","",$empresa_de_menor_tamano);

                $empresa_de_menor_tamano = substr($empresa_de_menor_tamano, -2);

                if ($empresa_de_menor_tamano == "SI"){
                    $empresa_de_menor_tamano = true;
                } elseif ($empresa_de_menor_tamano == "NO"){
                    $empresa_de_menor_tamano = false;
                } else {
                    $empresa_de_menor_tamano = false;
                }
            }catch (\Throwable $th) {
                $fail = true;
                $errors[] = 'Empresa de menor tamaño. (sin inicio de actividades)';
            }

        }

        if(!$fail){
                $errors[] = 'No se encontraron errores.';
        }

        return [
            'rut' => $rut,
            'dv' => $dv,
            'razon_social' => $razon_social,
            'inicio_actividades' => $inicio_de_actividades,
            'fecha_inicio_actividades' => $inicio_de_actividades ? $inicio_de_actividades_date : null,
            'moneda_extranjera' => $impuestos_moneda_extranjera,
            'pro_pyme' => $empresa_de_menor_tamano,
            'actividades' => $inicio_de_actividades ? $actividades : null,
            'documentos_timbrados' => $inicio_de_actividades ? $documentos_timbrados : null,
            'errores' => $errors,
        ];
    }

}
