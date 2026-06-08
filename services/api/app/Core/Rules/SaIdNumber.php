<?php

namespace App\Core\Rules;

use Carbon\Carbon;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class SaIdNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $value = (string) $value;

        if (! preg_match('/^\d{13}$/', $value)) {
            $fail('The SA ID number must be exactly 13 digits.');

            return;
        }

        if (! $this->passesLuhn($value)) {
            $fail('The SA ID number failed the checksum validation.');

            return;
        }

        if (! $this->validDateOfBirth($value)) {
            $fail('The SA ID number contains an invalid date of birth.');

            return;
        }

        $citizenship = $value[10];
        if (! in_array($citizenship, ['0', '1'], true)) {
            $fail('The SA ID number citizenship digit must be 0 (citizen) or 1 (permanent resident).');
        }
    }

    private function passesLuhn(string $digits): bool
    {
        $sum = 0;
        $length = strlen($digits);

        for ($i = 0; $i < $length; $i++) {
            $digit = (int) $digits[$i];
            if (($length - $i) % 2 === 0) {
                $digit *= 2;
                if ($digit >= 10) {
                    $digit = ($digit % 10) + 1;
                }
            }
            $sum += $digit;
        }

        return $sum % 10 === 0;
    }

    private function validDateOfBirth(string $digits): bool
    {
        $yy = (int) substr($digits, 0, 2);
        $mm = (int) substr($digits, 2, 2);
        $dd = (int) substr($digits, 4, 2);

        if ($mm < 1 || $mm > 12 || $dd < 1) {
            return false;
        }

        $century = $yy <= date('y') ? 2000 : 1900;
        $year = $century + $yy;

        return checkdate($mm, $dd, $year);
    }

    public static function extractDateOfBirth(string $digits): ?Carbon
    {
        if (! preg_match('/^\d{13}$/', $digits)) {
            return null;
        }

        $yy = (int) substr($digits, 0, 2);
        $mm = (int) substr($digits, 2, 2);
        $dd = (int) substr($digits, 4, 2);

        $century = $yy <= date('y') ? 2000 : 1900;

        if (! checkdate($mm, $dd, $century + $yy)) {
            return null;
        }

        return Carbon::createFromDate($century + $yy, $mm, $dd)->startOfDay();
    }

    public static function detectGender(string $digits): ?string
    {
        if (! preg_match('/^\d{13}$/', $digits)) {
            return null;
        }

        $genderDigit = (int) $digits[6];

        return $genderDigit < 5 ? 'female' : 'male';
    }

    public static function isSouthAfricanCitizen(string $digits): ?bool
    {
        if (! preg_match('/^\d{13}$/', $digits)) {
            return null;
        }

        $citizenship = $digits[10];

        if ($citizenship === '0') {
            return true;
        }
        if ($citizenship === '1') {
            return false;
        }

        return null;
    }
}
