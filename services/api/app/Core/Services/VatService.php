<?php

namespace App\Core\Services;

class VatService
{
    private float $vatRate;

    public function __construct(float $vatRate = 15.0)
    {
        $this->vatRate = $vatRate;
    }

    /**
     * Calculate VAT amount
     */
    public function calculateVAT(float $amount): float
    {
        return round($amount * ($this->vatRate / 100), 2);
    }

    /**
     * Calculate total including VAT
     */
    public function calculateTotalWithVAT(float $amount): float
    {
        return round($amount + $this->calculateVAT($amount), 2);
    }

    /**
     * Calculate amount excluding VAT (reverse calculation)
     */
    public function calculateAmountExcludingVAT(float $amountIncludingVAT): float
    {
        return round($amountIncludingVAT / (1 + ($this->vatRate / 100)), 2);
    }

    /**
     * Get VAT rate
     */
    public function getVatRate(): float
    {
        return $this->vatRate;
    }

    /**
     * Set VAT rate
     */
    public function setVatRate(float $rate): void
    {
        $this->vatRate = $rate;
    }

    /**
     * Format amount as ZAR currency
     */
    public function formatZAR(float $amount): string
    {
        return 'R' . number_format($amount, 2, '.', ',');
    }

    /**
     * Format amount as USD currency
     */
    public function formatUSD(float $amount): string
    {
        return '$' . number_format($amount, 2, '.', ',');
    }
}
