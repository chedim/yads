<?php
/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * Description of Operation
 *
 * @author chedim
 */
class ZenYandexOperation {
    protected $operation_id;
    protected $pattern_id;
    protected $type;
    protected $direction;
    protected $amount;
    protected $datetime;
    protected $title;
    protected $details;

    protected $int_type;


    public function  __construct(array $JSON_response_row, $details = null) {
        $this->operation_id = @$JSON_response_row['operation_id'];
        $this->pattern_id = @$JSON_response_row['pattern_id'];
        $this->type = @$JSON_response_row['type'];
        $this->title = @$JSON_response_row['title'];
        $this->direction = @$JSON_response_row['direction'];
        $this->amount = @$JSON_response_row['amount'];
        $this->int_type = (substr($this->direction, 0, 2) == 'in') ? 1 : -1;
        $this->datetime = strtotime(@$JSON_response_row['datetime']);

        if (is_array($details)) {
            $this->details = $details['details'];
        }
    }


    public function getOperationId() {
        if ($this->operation_id !== null) 
                return $this->operation_id;
        return false;
    }

    public function getPatternId() {
        return $this->pattern_id;
    }

    public function getType() {
        return $this->type;
    }

    public function getDirection() {
        return $this->direction;
    }

    public function getIntType() {
        return $this->int_type;
    }

    public function getAmount() {
        return $this->amount;
    }

    public function getAsTransfer() {
        $result = array(
            'account_income' => null,
            'account_outcome' => null,
            'income' => $this->amount * (int)($this->int_type != -1),
            'outcome' => $this->amount * (int)($this->int_type != 1),
        );
        return $result;
    }

    public function getTitle() {
        return $this->title;
    }

    public function getDateTime() {
        return $this->datetime;
    }

    public function getDetails() {
        if ($this->details === null) {
            throw new ZenYandexException('operations-details not fetched');
        }
        return $this->details;
    }
}
?>
