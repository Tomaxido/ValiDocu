<?php

namespace App\Http\Controllers;

use DOMDocument;
use DOMXPath;
use GuzzleHttp\Client;

class ApiSiiController extends Controller
{
    public function check_dte($rut, $dv){
        $errors_validator = [];

        if($rut == null || $rut == ''){
            $errors_validator['rut'] = 'El campo rut es obligatorio.';
        }
        if($dv == null || $dv == ''){
            $errors_validator['dv'] = 'El campo dv es obligatorio.';
        }

        if (count($errors_validator) > 0) {

            $response = [
                'code' => 400,
                'message' => $errors_validator,
            ];

            return response()->json($response, 400);
        }

        $validar_rut = $this->validar_rut($rut.$dv);

        if (!$validar_rut) {

            $response = [
                'code' => 400,
                'message' => 'El rut es invalido'
            ];

            return response()->json($response, 400);
        }


        $client = new Client();
        try {
            $res = $client->post('https://zeus.sii.cl/cvc_cgi/stc/CViewCaptcha.cgi', [
                'form_params' => [
                    'oper' => 0,
                ]
            ]);
        } catch (\Throwable $th) {
            $response = [
                'code' => 400,
                'message' => 'Problemas al hacer petición a SII.'
            ];
            return response()->json($response, 400);
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

        $fail = false;
        $errors = [];

        $html = (string) $res->getBody();

        $dom = new DOMDocument();
        $domHtml = @$dom->loadHTML($html);
        $dom->preserveWhiteSpace = false;
        $xpath = new DOMXPath($dom);

        $razon_social = "";
        try{
            $nodes = $xpath->query('/html/body/div/div[4]');
            $razon_social = trim($nodes[0]->childNodes[0]->nodeValue);

            $nodes = $xpath->query('/html/body/div/div[6]');
            $rut = $nodes[0]->childNodes[0]->nodeValue;

            // $nodes = $xpath->query('/html/body/div/span[1]');
            // $realizacion_consulta = $nodes[0]->childNodes[1]->nodeValue;
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

            if($inicio_de_actividades == "SI"){
                $inicio_de_actividades = true;
            }else if($inicio_de_actividades == "NO"){
                $inicio_de_actividades = false;
            }else{
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

                    $glosa = trim($xpath->query('./td[1]/font', $node)[0]->nodeValue);
                    $codigo = trim($xpath->query('./td[2]/font', $node)[0]->nodeValue);
                    $categoria = trim($xpath->query('./td[3]/font', $node)[0]->nodeValue);

                    if($categoria == 'Primera'){
                        $categoria = 1;
                    }else if($categoria == 'Segunda'){
                        $categoria = 2;
                    }

                    $afecta = trim($xpath->query('./td[4]/font', $node)[0]->nodeValue);
                    $fecha = trim($xpath->query('./td[5]/font', $node)[0]->nodeValue);

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

                    $documento = trim($xpath->query('./td[1]/font', $node)[0]->nodeValue);
                    $ultimo_timbraje = trim($xpath->query('./td[2]/font', $node)[0]->nodeValue);

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

                if($impuestos_moneda_extranjera == "SI"){
                    $impuestos_moneda_extranjera = true;
                }else if($impuestos_moneda_extranjera == "NO"){
                    $impuestos_moneda_extranjera = false;
                }else{
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

                if($empresa_de_menor_tamano == "SI"){
                    $empresa_de_menor_tamano = true;
                }else if($empresa_de_menor_tamano == "NO"){
                    $empresa_de_menor_tamano = false;
                }else{
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

                if($impuestos_moneda_extranjera == "SI"){
                    $impuestos_moneda_extranjera = true;
                }else if($impuestos_moneda_extranjera == "NO"){
                    $impuestos_moneda_extranjera = false;
                }else{
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

                if($empresa_de_menor_tamano == "SI"){
                    $empresa_de_menor_tamano = true;
                }else if($empresa_de_menor_tamano == "NO"){
                    $empresa_de_menor_tamano = false;
                }else{
                    $empresa_de_menor_tamano = false;
                }
            }catch (\Throwable $th) {
                $fail = true;
                $errors[] = 'Empresa de menor tamaño. (sin inicio de actividades)';
            }

        }

        if($fail){
            // Puedes dar aviso aqui si falla el scraping.
        }

        $response = [];
        $response['rut'] = $rut;
        $response['dv'] = $dv;
        $response['razon_social'] = $razon_social;
        $response['inicio_actividades'] = $razon_social;

        $response['inicio_actividades'] = $inicio_de_actividades;

        if($inicio_de_actividades){
            $response['fecha_inicio_actividades'] = $inicio_de_actividades_date;
        }

        $response['moneda_extranjera']=  $impuestos_moneda_extranjera;
        $response['pro_pyme'] =  $empresa_de_menor_tamano;

        if($inicio_de_actividades){
            $response['actividades'] = $actividades;
        }

        if($inicio_de_actividades){
            $response['documentos_timbrados'] =  $documentos_timbrados;
        }

        return response()->json($response, 200);
    }

    function validar_rut($rut){

        $rut = preg_replace('/[^k0-9]/i', '', $rut);
        $dv  = substr($rut, -1);
        $numero = substr($rut, 0, strlen($rut)-1);
        $i = 2;
        $suma = 0;

        foreach(array_reverse(str_split($numero)) as $v)
        {
            if($i==8)
                $i = 2;

            $suma += $v * $i;
            ++$i;
        }

        $dvr = 11 - ($suma % 11);

        if($dvr == 11)
            $dvr = 0;
        if($dvr == 10)
            $dvr = 'K';

        if($dvr == strtoupper($dv))
            return true;
        else
            return false;

    }

    public function prueba(){

        $rut = '77.884.401-K';
        $rut = preg_replace('/[^k0-9]/i', '', $rut);
        $dv  = substr($rut, -1);
        $numero = substr($rut, 0, strlen($rut)-1);
        $i = 2;
        $suma = 0;

        $resultadoDTE = app('App\Http\Controllers\ApiSiiController')->check_dte($numero, $dv);
        $status = $resultadoDTE->status();

        dd($resultadoDTE->getData());

        if($status == 200){

            $data = $resultadoDTE->getData();

            dd($data, $status);

            $dte_processed = 1;
            $dte_data = json_encode($data);

            if ($data->inicio_actividades){
                $categoria = $data->actividades[0]->categoria;
                if ($categoria == 1) // si es categoria tipo 1 = pyme, si es 2 = persona con boletas
                    $dte_pyme = 1;
                else
                    $dte_pyme = 0;
            }else{
                $dte_pyme = 0;
            }

        }

    }
}
