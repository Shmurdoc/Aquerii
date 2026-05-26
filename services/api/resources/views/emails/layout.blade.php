<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>@yield('title', $workspaceName ?? 'Aquerii')</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                    {{-- Header --}}
                    <tr>
                        <td style="background-color:{{ $brandColor ?? '#7c3aed' }}; padding:28px 32px; text-align:center;">
                            @if (!empty($logoUrl))
                                <img src="{{ $logoUrl }}" alt="{{ $workspaceName ?? '' }}" style="max-height:48px; max-width:180px; display:block; margin:0 auto 10px;">
                            @else
                                @php
                                    $words = preg_split('/\s+/', trim($workspaceName ?? 'A'));
                                    $initials = strtoupper(substr($words[0], 0, 1));
                                    if (isset($words[1])) {
                                        $initials .= strtoupper(substr($words[1], 0, 1));
                                    }
                                @endphp
                                <div style="display:inline-block; margin:0 auto 10px;">
                                    <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                                        <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.18)"/>
                                        <text x="28" y="28" dominant-baseline="central" text-anchor="middle"
                                              font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
                                              font-size="{{ strlen($initials) > 1 ? '18' : '22' }}"
                                              font-weight="700"
                                              fill="#ffffff">{{ $initials }}</text>
                                    </svg>
                                </div>
                            @endif
                            <div style="color:rgba(255,255,255,0.85); font-size:12px; font-weight:500; letter-spacing:0.04em; text-transform:uppercase;">
                                {{ $workspaceName ?? '' }}
                            </div>
                        </td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td style="background-color:#ffffff; padding:32px;">
                            @yield('body')
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="background-color:#f4f4f5; padding:20px 32px; text-align:center; border-top:1px solid #e4e4e7;">
                            <p style="margin:0; font-size:12px; color:#a1a1aa; line-height:1.6;">
                                &copy; {{ date('Y') }} {{ $workspaceName ?? 'Aquerii' }}. Powered by <strong style="color:#a1a1aa;">Aquerii</strong>.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
