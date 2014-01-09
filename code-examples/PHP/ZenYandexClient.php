<?php
/**
 * Description of Client
 *
 * @author ZenMoney team: support@zenmoney.ru
 *
 */


if (!class_exists('ZenCurlAbstract')) {
    require_once dirname(__FILE__) . '/Curl/Abstract.php';
    require_once dirname(__FILE__) . '/Operation.php';
    require_once dirname(__FILE__) . '/Exception.php';
}

class ZenYandexClient extends ZenCurlAbstract implements Iterator
{
    protected static $client_id = '';
    protected static $access_token;
    const API_BASE = 'https://money.yandex.ru/api';
    const AUTH_POINT = 'https://sp-money.yandex.ru/oauth/authorize';
    const EXCHANGE_POINT = 'https://sp-money.yandex.ru/oauth/token';
    const SCOPE_ACCOUNT_INFO = ' account-info';
    const SCOPE_OPERATION_HISTORY = ' operation-history';
    const SCOPE_OPERATION_DETAILS = ' operation-details';
    const SCOPE_PAYMENT_SHOP = ' payment-shop';
    protected static $current_filter;
    protected $current_set = null;

    public static function setClientId($client_id)
    {
        self::$client_id = $client_id;
    }

    public static function setAccessToken($access_token)
    {
        self::$access_token = $access_token;
    }

    /**
     * sends user to Yandex authorization url
     * DONT RETURNING, DIES!
     *
     * @param string $scope mix of SCOPE-consants, defined in this class
     * @param string $client_user_name local client READABLE identifier
     * @throws ZenYandexException
     */
    public static function authorize($scope = null, $redirect_uri = null, $die = true)
    {
        if ($scope === null) {
            $scope = 'account-info payment-shop';
        }
        if (!isset(self::$client_id)) {
            throw new ZenYandexException('Client id was not defined', 500001);
        }
        $scope = trim($scope);
        $redirect_uri = urlencode($redirect_uri);
        header('Location: ' . self::AUTH_POINT . "?client_id=" . self::$client_id .
            "&response_type=code&scope=$scope&redirect_uri=$redirect_uri");
        if ($die)
            die();
    }


    /**
     *
     * @deprecated
     */
    public static function handleCallback()
    {
        return $this->convertAuthToken();
        $src = @file_get_contents('php://input');
        if (null == ($result = json_decode($src))) {
            self::debugLast();
            throw new ZenYandexException('Response decoding failed: ' . $src, 500000 + self::$last_http_status);
        }
        if (@$result['error']) {
            throw new ZenYandexException(@$result['error'], 500003);
        }

        if (!key_exists('access_token', $result)) {
            self::debugLast();
            throw new ZenYandexException('Response decoding failed', 500000 + self::$last_http_status);
        }
        return @$result['access_token'];
    }

    public static function convertAuthToken()
    {
        $token = @$_GET['code'];
        if (@$_GET['error']) {
            throw new ZenYandexException(@$_GET['error_description'], 500003);
        }
        if (!isset(self::$client_id)) {
            throw new ZenYandexException('Client id was not defined', 500001);
        }
        $params = array(
            'grant_type' => 'authorization_code',
            'client_id' => self::$client_id,
            'code' => $token,
        );
        $response = self::get(self::EXCHANGE_POINT, $params, parent::RT_POST);
        $result = @json_decode($response, true);
        if (!$result) {
            self::debugLast();
            throw new ZenYandexException('Response decoding failed:' . $response, 500000 + self::$last_http_status);
        }
        if (@$result['error']) {
            throw new ZenYandexException(@$result['error_description'], 500003);
        }
        return @$result['access_token'];
    }

    public function getAccountInformation()
    {
        if (!self::$access_token) {
            throw new ZenYandexException('Auth token was not defined', 500002);
        }
        $header = "Authorization: Bearer " . self::$access_token;
        $url = self::API_BASE . '/account-info';
        $response = self::get($url, null, self::RT_POST, $header);
        if (null === ($response = @json_decode($response, true))) {
            self::debugLast();
            throw new ZenYandexException('Response decoding failed', 500000 + self::$last_http_status);
        }
        return $response;
    }

    public function listOperationHistory($type = null, $start_record = null, $records = null, $details = null, $objects = true)
    {
        if (!isset(self::$access_token)) {
            throw new ZenYandexException('Auth token was not defined', 500002);
        }
        $header = "Authorization: Bearer " . self::$access_token;

        $params = array();
        if ($type !== null) @$params['type'] = $type;
        else @$params['type'] = 'deposition payment';
        if ($start_record !== null) @$params['start_record'] = $start_record;
        else @$params['start_record'] = 0;
        if ($records !== null) @$params['records'] = $records;
        else @$params['records'] = 100;

        self::$current_filter = $params;
        self::$current_filter['details'] = $details;
        $url = self::API_BASE . '/operation-history';

        $response = self::get($url, $params, self::RT_POST, $header);
        if (null === ($response = @json_decode($response, true))) {
            self::debugLast();
            throw new ZenYandexException('Response decoding failed', 500000 + self::$last_http_status);
        }
        if (@$response['error']) {
            throw new ZenYandexException(@$result['error'], 500003);
        }

        if (!($objects || $details))
            return $operations;
        $operations = @$response['operations'];
        $result = array();
        $co = count($operations);
        for ($i = 0; $i < $co; $i++) {
            $ext = null;
            if ($details !== null) {
                $ext = self::getOperationDetails(@$operations[$i]['operation_id']);
            }
            @$result[] = new ZenYandexOperation(@$operations[$i], $ext);
        }

        @$response['operations'] = &$result;
        $this->current_set = $response;

        return $response;
    }

    public function  __construct($access_token, $start_operation = null)
    {
        self::setAccessToken($access_token);
        self::useStrongSSL();
        self::setCA(dirname(__FILE__).'/ym.crt');
        if ((int)$start_operation) {
            $this->current_set = array(
                'next_record' => $start_operation,
            );
        }
    }

    public static function getOperationDetails($operation_id)
    {
        if (!isset(self::$access_token)) {
            throw new ZenYandexException('Auth token was not defined', 500002);
        }
        $header = "Authorization: Bearer " . self::$access_token;

        $params = array();
        @$params['operation_id'] = $operation_id;
        $url = self::API_BASE . '/operation-details';

        $orig_response = self::get($url, $params, self::RT_POST, $header);
        if (null === ($response = @json_decode($orig_response, true))) {
            self::debugLast();
            throw new ZenYandexException('Response decoding failed', 500000 + self::$last_http_status);
        }
        if (@$response['error']) {
            throw new ZenYandexException(@$result['error'], 500003);
        }

        return $response;
    }

    public function current()
    {
        return current($this->current_set['operations']);
    }

    public function key()
    {
        return self::$current_filter['start_record']
            + key($this->current_set['operations']);
    }

    /**
     *
     * @return ZenYandexOperation
     */
    public function next()
    {
        $ops = $this->current_set;
        if (!($n = @next($this->current_set['operations']))) {
            if (($ops === null) ||
                (@$ops['next_record'])
            ) {
                $f = self::$current_filter;
                $this->listOperationHistory(@$f['type'], @$this->current_set['next_record'], @$f['records'], @$f['details']);
                $n = @current($this->current_set['operations']);
            } else {
                return false;
            }
        }
        return $n;
    }

    public function rewind()
    {
        unset($this->current_set);
    }

    public function valid()
    {
        return current($this->current_set['operations']) !== false;
    }

}

?>
