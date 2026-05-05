<?php

use App\Rules\PasswordStrength;

/**
 * Helper: run the rule and return first failure message, or null if valid.
 */
function validatePassword(string $password): ?string
{
    $errors = [];
    $rule   = new PasswordStrength();
    $rule->validate('password', $password, function (string $msg) use (&$errors) {
        $errors[] = $msg;
    });
    return $errors[0] ?? null;
}

it('accepts a strong password', function () {
    expect(validatePassword('MyStr0ng!Pass'))->toBeNull();
});

it('accepts password with exactly 12 characters meeting all criteria', function () {
    expect(validatePassword('Abcdefg1234!'))->toBeNull();
});

it('rejects passwords shorter than 12 characters', function () {
    expect(validatePassword('Short1!'))->not->toBeNull();
});

it('rejects passwords without uppercase letter', function () {
    expect(validatePassword('alllower123!!'))->not->toBeNull();
});

it('rejects passwords without lowercase letter', function () {
    expect(validatePassword('ALLUPPERCASE1!'))->not->toBeNull();
});

it('rejects passwords without digits', function () {
    expect(validatePassword('NoDigitsHere!!'))->not->toBeNull();
});

it('rejects passwords without special characters', function () {
    expect(validatePassword('NoSpecial123abc'))->not->toBeNull();
});

it('rejects empty password', function () {
    expect(validatePassword(''))->not->toBeNull();
});
