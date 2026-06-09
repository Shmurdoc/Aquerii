<?php

namespace App\Modules\CRM\Jobs;

use App\Modules\CRM\Models\CrmContact;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use League\Csv\Reader;

class ImportCrmContactsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected string $workspaceId,
        protected string $path,
        protected ?array $fieldMapping,
        protected string $importId,
    ) {}

    public function handle(): void
    {
        $total = 0;
        $imported = 0;
        $errors = [];

        try {
            $csv = Reader::createFromString(Storage::get($this->path));
            $csv->setHeaderOffset(0);

            $headers = $csv->getHeader();
            $mapping = $this->fieldMapping ?? $this->guessMapping($headers);

            foreach ($csv->getRecords() as $rowIndex => $row) {
                $total++;

                try {
                    $data = $this->mapRow($row, $mapping);
                    $data['workspace_id'] = $this->workspaceId;

                    if (empty($data['first_name']) || empty($data['last_name'])) {
                        $errors[] = "Row {$rowIndex}: first_name and last_name required";

                        continue;
                    }

                    CrmContact::create($data);
                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = "Row {$rowIndex}: {$e->getMessage()}";
                    Log::warning('CRM import row failed', [
                        'import_id' => $this->importId,
                        'row' => $rowIndex,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            Storage::delete($this->path);
        } catch (\Exception $e) {
            $errors[] = "Fatal: {$e->getMessage()}";
            Log::error('CRM import failed', [
                'import_id' => $this->importId,
                'error' => $e->getMessage(),
            ]);
        }

        Cache::put("import:{$this->importId}", [
            'status' => empty($errors) ? 'completed' : 'completed_with_errors',
            'total' => $total,
            'imported' => $imported,
            'errors' => array_slice($errors, 0, 100),
        ], now()->addDay());
    }

    protected function guessMapping(array $headers): array
    {
        $fieldMap = [
            'firstname' => 'first_name',
            'first name' => 'first_name',
            'first_name' => 'first_name',
            'given name' => 'first_name',
            'lastname' => 'last_name',
            'last name' => 'last_name',
            'last_name' => 'last_name',
            'surname' => 'last_name',
            'family name' => 'last_name',
            'email' => 'email',
            'e-mail' => 'email',
            'phone' => 'phone',
            'telephone' => 'phone',
            'mobile' => 'phone',
            'company' => 'company_name',
            'organization' => 'company_name',
            'organisation' => 'company_name',
            'job title' => 'job_title',
            'title' => 'job_title',
            'position' => 'job_title',
            'notes' => 'notes',
            'source' => 'source',
            'tags' => 'tags',
            'lead score' => 'lead_score',
            'score' => 'lead_score',
        ];

        $mapping = [];
        foreach ($headers as $header) {
            $lower = strtolower(trim($header));
            if (isset($fieldMap[$lower])) {
                $mapping[$header] = $fieldMap[$lower];
            } else {
                $mapping[$header] = $lower;
            }
        }

        return $mapping;
    }

    protected function mapRow(array $row, array $mapping): array
    {
        $data = [];
        foreach ($mapping as $csvHeader => $crmField) {
            $value = $row[$csvHeader] ?? null;
            if ($value !== null && $value !== '') {
                if (in_array($crmField, ['tags', 'social_links']) && is_string($value)) {
                    $value = array_map('trim', explode(';', $value));
                }
                if (in_array($crmField, ['lead_score', 'score'])) {
                    $value = (int) $value;
                }
                $data[$crmField] = $value;
            }
        }

        return $data;
    }
}
