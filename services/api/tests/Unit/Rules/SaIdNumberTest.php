<?php

use App\Core\Rules\SaIdNumber;

function validateSaId(string $id): ?string
{
    $errors = [];
    $rule = new SaIdNumber;
    $rule->validate('sa_id_number', $id, function (string $msg) use (&$errors) {
        $errors[] = $msg;
    });

    return $errors[0] ?? null;
}

it('passes a valid SA ID number', function () {
    expect(validateSaId('8001015009087'))->toBeNull();
});

it('rejects an ID with wrong checksum', function () {
    expect(validateSaId('8001015009088'))->not->toBeNull();
});

it('rejects an ID with less than 13 digits', function () {
    expect(validateSaId('80010150090'))->not->toBeNull();
});

it('rejects an ID with more than 13 digits', function () {
    expect(validateSaId('80010150090871'))->not->toBeNull();
});

it('rejects an ID with non-numeric characters', function () {
    expect(validateSaId('8001015009A87'))->not->toBeNull();
});

it('rejects an ID with invalid date of birth (month 99)', function () {
    expect(validateSaId('8099015009087'))->not->toBeNull();
});

it('extracts date of birth correctly', function () {
    $dob = SaIdNumber::extractDateOfBirth('8001015009087');
    expect($dob)->not->toBeNull();
    expect($dob->format('Y-m-d'))->toBe('1980-01-01');
});

it('detects gender correctly', function () {
    expect(SaIdNumber::detectGender('8001015009087'))->toBe('male');
    expect(SaIdNumber::detectGender('8001014009087'))->toBe('female');
});

it('detects citizenship correctly', function () {
    expect(SaIdNumber::isSouthAfricanCitizen('8001015009087'))->toBeTrue();
    expect(SaIdNumber::isSouthAfricanCitizen('8001015009187'))->toBeFalse();
});

it('returns null for invalid IDs in static methods', function () {
    expect(SaIdNumber::extractDateOfBirth('123'))->toBeNull();
    expect(SaIdNumber::detectGender('456'))->toBeNull();
    expect(SaIdNumber::isSouthAfricanCitizen('789'))->toBeNull();
});
