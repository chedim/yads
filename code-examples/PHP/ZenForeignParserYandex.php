<?php

class ZenForeignParserYandex extends ZenForeignParserAbstract
{

    /**
     * @var ZenYandexClient
     */
    protected $zyc = null;
    protected $bearer = null;
    protected $ainfo = array();
    protected $firstId = null;

    public function getTransactionsBase($recalc)
    {
        // TODO: Implement getTransactionsBase() method.
    }

    public function setTransactionsBase($base)
    {
        // TODO: Implement setTransactionsBase() method.
    }

    public function __construct($conninfo)
    {
        $this->bearer = @$conninfo['data']['oauth_bearer'][0]['value'];
        $this->zyc = new ZenYandexClient($this->bearer);
        $this->ainfo = $this->zyc->getAccountInformation();
        $this->connection = $conninfo;
    }

    public function __destruct()
    {
        if ($this->firstId)
            sqlConnectionDataUpdate::put($this->connection['user'], $this->connection['id'], 'sync_state', $this->firstId);
        //echo "Total connection transactions count: $nr<br/><br/>\n\n";
    }

    public function getFileExt()
    {
        return 'mail';
    }

    public function getBalance($syncid = null)
    {
        return $this->ainfo['balance'];
    }

    public function getCompany($syncid = null)
    {
        $company = sqlCompanyFromSyncName::fetch('yandex');
        return $company['id'];
    }

    public function getLocation($location, $base = null)
    {
        return false;
    }

    public function getSyncid()
    {
        return substr($this->ainfo['account'], -6);
    }

    public function getTransactionBase($index, $base, $syncid = null)
    {
        return false;
    }

    public function readNextTransaction($syncid = null)
    {
        $transaction = $this->zyc->next();
        if (!$transaction) return false;
        $t = $transaction->getAsTransfer();
        unset($t['account_income']);
        unset($t['account_outcome']);
        $t['comment'] = $transaction->getTitle();
        $t['date'] = date('Y-m-d', $transaction->getDateTime());
        $t['bankid'] = $transaction->getOperationId();
        if ($this->firstId === null)
            $this->firstId = $t['bankid'];
        if ($t['bankid'] == $this->connection['data']['sync_state'][0]['value'])
            return false;
        return $t;
    }

    public function getFopenURL($conninfo)
    {
        return false;
    }

    public function getAccountInstrument($syncid = null)
    {
        return 2;
    }

    public function getUpdateInterval()
    {
        return '6 hours';
    }
}
