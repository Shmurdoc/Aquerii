<?php

namespace App\Core\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\View;

class PdfService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.gotenberg.url', env('GOTENBERG_URL', 'http://gotenberg:3000')), '/');
    }

    /**
     * Render a Blade view to HTML, then send it to Gotenberg for PDF conversion.
     *
     * @param  string  $view  Blade view name (e.g. 'pdfs.invoice.modern')
     * @param  array  $data  Data to pass to the view
     * @return string Raw PDF binary content
     */
    public function renderBladeAsPdf(string $view, array $data = []): string
    {
        $html = View::make($view, $data)->render();

        return $this->htmlToPdf($html);
    }

    /**
     * Convert raw HTML string to PDF via Gotenberg Chromium endpoint.
     */
    public function htmlToPdf(string $html): string
    {
        $response = Http::attach('files', $html, 'index.html', ['Content-Type' => 'text/html'])
            ->post("{$this->baseUrl}/forms/chromium/convert/html", [
                'marginTop' => '0.5in',
                'marginBottom' => '0.5in',
                'marginLeft' => '0.6in',
                'marginRight' => '0.6in',
                'paperWidth' => '8.27',
                'paperHeight' => '11.69',
                'printBackground' => 'true',
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('Gotenberg PDF conversion failed: '.$response->body());
        }

        return $response->body();
    }
}
