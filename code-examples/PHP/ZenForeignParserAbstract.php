<?php

abstract class ZenForeignParserAbstract implements ZenForeignParserInterfaceAbstract {

    protected $waits = array();
    protected $supported_functions = array();
    protected $fp;
    protected $format = null;
    protected $url = '';
    protected $connection = array();
    protected $transaction_count = 0;

    public function __construct($conninfo) {
        $this->connection = $conninfo;
        $url = $this->getFopenURL($conninfo);
		if ($url === null) {
			throw new errNothingToDo();
		}
        $this->url = $url;
        $this->fp = fopen($url, 'r');
    }

    public function supports($function) {
        return in_array($function, $this->supported_functions);
    }

    /**
     *
     * @param type $className
     * @param type $data 
     * @return ZenForeignParserAbstract
     */
    public static function factory($className, $data) {
        if (!class_exists($className, true)) {
            return false;
        }
        return new $className($data);
    }

    public function getFileExtName() {
        return $this->getFileExt();
    }

    public function getTransactions($syncid = null) {
        $format = $this->format;
        $transactions = array();
        while (is_array($transaction = $this->readNextTransaction($syncid = null))) {
            $transactions[] = $transaction;
        }
        return $transactions;
    }
    
    public function getInfo($syncid = null) {
        return array();
    }

    public function getUpdateInterval() {
        throw new errUnsupported();
    }

    public function getLastTransactionSource() {
        throw new errUnsupported();
    }

    public function setNextTransactionSource($source) {
        throw new errUnsupported();
    }

    public function isAccountCreationAllowed($company)
    {
        return sqlConnectorAutocreate::fetch($company);
    }


}
