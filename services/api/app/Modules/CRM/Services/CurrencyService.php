<?php

namespace App\Modules\CRM\Services;

class CurrencyService
{
    protected static array $rates = [
        'USD' => 1.0,
        'EUR' => 1.12,
        'GBP' => 1.27,
        'JPY' => 0.0069,
        'CAD' => 0.73,
        'AUD' => 0.65,
        'CHF' => 1.10,
        'CNY' => 0.14,
        'INR' => 0.012,
        'MXN' => 0.058,
        'BRL' => 0.20,
        'ZAR' => 0.054,
    ];

    public static function getRates(): array
    {
        return self::$rates;
    }

    public static function convert(float $amount, string $from, string $to, ?string $date = null): float
    {
        if ($from === $to) {
            return $amount;
        }

        $fromRate = self::$rates[$from] ?? null;
        $toRate = self::$rates[$to] ?? null;

        if ($fromRate === null || $toRate === null) {
            throw new \InvalidArgumentException('Unsupported currency: '.($fromRate === null ? $from : $to));
        }

        $usdAmount = $amount / $fromRate;

        return round($usdAmount * $toRate, 2);
    }

    public static function format(float $amount, string $currency): string
    {
        $symbols = [
            'USD' => '$',
            'EUR' => '€',
            'GBP' => '£',
            'JPY' => '¥',
            'CAD' => 'C$',
            'AUD' => 'A$',
            'CHF' => 'CHF',
            'CNY' => '¥',
            'INR' => '₹',
            'MXN' => 'Mex$',
            'BRL' => 'R$',
            'ZAR' => 'R',
        ];

        $symbol = $symbols[$currency] ?? $currency.' ';
        $formatted = number_format($amount, 2);

        return $symbol.$formatted;
    }

    public static function currencies(): array
    {
        return array_keys(self::$rates);
    }
}
