<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IndustryTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'id' => 'tire-fitting',
                'name' => 'Tire Fitting',
                'description' => 'Complete tire services for trucks and heavy vehicles',
                'job_types' => json_encode([
                    [
                        'name' => 'Tire Change',
                        'description' => 'Replace worn or damaged tires',
                        'checklist' => ['Inspect current tire condition', 'Check wheel nuts and studs', 'Mount new tire', 'Balance tire', 'Torque wheel nuts to spec', 'Check tire pressure', 'Road test'],
                        'custom_fields' => [
                            ['name' => 'Tire Size', 'type' => 'select', 'options' => ['295/80R22.5', '315/80R22.5', '385/65R22.5', '12.00R20']],
                            ['name' => 'Tire Brand', 'type' => 'text', 'placeholder' => 'e.g., Bridgestone, Michelin'],
                            ['name' => 'Tread Depth', 'type' => 'number', 'unit' => 'mm'],
                            ['name' => 'Axle Position', 'type' => 'select', 'options' => ['Front Left', 'Front Right', 'Rear Left', 'Rear Right', 'Drive Axle', 'Trailer']]
                        ],
                        'estimated_hours' => 1.5
                    ],
                    [
                        'name' => 'Puncture Repair',
                        'description' => 'Repair punctured tire',
                        'checklist' => ['Remove tire from wheel', 'Inspect damage', 'Apply patch', 'Test repair', 'Rebalance tire', 'Refit and torque'],
                        'custom_fields' => [
                            ['name' => 'Puncture Location', 'type' => 'select', 'options' => ['Tread', 'Sidewall', 'Shoulder']],
                            ['name' => 'Patch Type', 'type' => 'select', 'options' => ['Mushroom', 'Plug', 'Patch']]
                        ],
                        'estimated_hours' => 0.75
                    ],
                    [
                        'name' => 'Wheel Alignment',
                        'description' => 'Check and adjust wheel alignment',
                        'checklist' => ['Mount vehicle on alignment rack', 'Measure current alignment', 'Adjust camber', 'Adjust caster', 'Adjust toe', 'Road test'],
                        'custom_fields' => [
                            ['name' => 'Front Camber', 'type' => 'number', 'unit' => 'degrees'],
                            ['name' => 'Front Toe', 'type' => 'number', 'unit' => 'mm'],
                            ['name' => 'Rear Camber', 'type' => 'number', 'unit' => 'degrees']
                        ],
                        'estimated_hours' => 1
                    ]
                ]),
                'custom_fields' => json_encode([
                    ['name' => 'Vehicle Registration', 'type' => 'text', 'required' => true],
                    ['name' => 'Vehicle Make', 'type' => 'text'],
                    ['name' => 'Fleet Number', 'type' => 'text']
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 'truck-maintenance',
                'name' => 'Truck Maintenance',
                'description' => 'Vehicle service, repair, and inspection',
                'job_types' => json_encode([
                    [
                        'name' => 'Full Service',
                        'description' => 'Complete vehicle service',
                        'checklist' => ['Engine oil change', 'Oil filter replacement', 'Air filter inspection', 'Fuel filter check', 'Brake inspection', 'Tire pressure check', 'Fluid levels check', 'Belt inspection', 'Battery check', 'Road test'],
                        'custom_fields' => [
                            ['name' => 'Odometer Reading', 'type' => 'number', 'unit' => 'km'],
                            ['name' => 'Oil Grade', 'type' => 'select', 'options' => ['10W-40', '15W-40', '20W-50', '5W-30']],
                            ['name' => 'Oil Quantity', 'type' => 'number', 'unit' => 'liters']
                        ],
                        'estimated_hours' => 2
                    ],
                    [
                        'name' => 'Brake Service',
                        'description' => 'Brake inspection and repair',
                        'checklist' => ['Inspect brake pads', 'Inspect brake discs', 'Check brake fluid', 'Test brake performance', 'Road test'],
                        'custom_fields' => [
                            ['name' => 'Front Pad Thickness', 'type' => 'number', 'unit' => 'mm'],
                            ['name' => 'Rear Pad Thickness', 'type' => 'number', 'unit' => 'mm'],
                            ['name' => 'Brake Fluid Level', 'type' => 'select', 'options' => ['Full', 'Low', 'Critical']]
                        ],
                        'estimated_hours' => 1.5
                    ],
                    [
                        'name' => 'Breakdown Recovery',
                        'description' => 'Emergency breakdown assistance',
                        'checklist' => ['Assess situation', 'Safety setup (reflectors, cones)', 'Diagnose fault', 'Temporary repair or tow', 'Client notification'],
                        'custom_fields' => [
                            ['name' => 'Location', 'type' => 'text', 'required' => true],
                            ['name' => 'Fault Description', 'type' => 'textarea'],
                            ['name' => 'Recovery Method', 'type' => 'select', 'options' => ['Roadside Repair', 'Tow to Workshop', 'Mobile Workshop']]
                        ],
                        'estimated_hours' => 2
                    ]
                ]),
                'custom_fields' => json_encode([
                    ['name' => 'Vehicle Registration', 'type' => 'text', 'required' => true],
                    ['name' => 'Vehicle Make/Model', 'type' => 'text'],
                    ['name' => 'Fleet Number', 'type' => 'text'],
                    ['name' => 'Odometer Reading', 'type' => 'number', 'unit' => 'km']
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 'electrical',
                'name' => 'Electrical Services',
                'description' => 'Electrical installation, repair, and compliance',
                'job_types' => json_encode([
                    [
                        'name' => 'Installation',
                        'description' => 'New electrical installation',
                        'checklist' => ['Safety isolation verified', 'Circuit design approved', 'Cable installation', 'Connection and termination', 'Insulation resistance test', 'Earth continuity test', 'Circuit labeling', 'COC issued'],
                        'custom_fields' => [
                            ['name' => 'Circuit Number', 'type' => 'text'],
                            ['name' => 'Cable Size', 'type' => 'select', 'options' => ['1.5mm²', '2.5mm²', '4mm²', '6mm²', '10mm²', '16mm²']],
                            ['name' => 'Breaker Rating', 'type' => 'number', 'unit' => 'A']
                        ],
                        'estimated_hours' => 4
                    ],
                    [
                        'name' => 'Repair',
                        'description' => 'Electrical fault repair',
                        'checklist' => ['Safety isolation', 'Fault diagnosis', 'Repair execution', 'Testing', 'Certificate issued'],
                        'custom_fields' => [
                            ['name' => 'Fault Description', 'type' => 'textarea'],
                            ['name' => 'Fault Location', 'type' => 'text']
                        ],
                        'estimated_hours' => 2
                    ],
                    [
                        'name' => 'Compliance Inspection',
                        'description' => 'Annual electrical compliance check',
                        'checklist' => ['Visual inspection', 'Earth continuity test', 'Insulation resistance test', 'RCD trip test', 'Circuit identification', 'COC issued'],
                        'custom_fields' => [
                            ['name' => 'COC Number', 'type' => 'text'],
                            ['name' => 'Valid Until', 'type' => 'date'],
                            ['name' => 'Non-Compliances Found', 'type' => 'number']
                        ],
                        'estimated_hours' => 2
                    ]
                ]),
                'custom_fields' => json_encode([
                    ['name' => 'Property Address', 'type' => 'text', 'required' => true],
                    ['name' => 'Client Name', 'type' => 'text'],
                    ['name' => 'Municipality', 'type' => 'text']
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 'plumbing',
                'name' => 'Plumbing Services',
                'description' => 'Plumbing installation, repair, and compliance',
                'job_types' => json_encode([
                    [
                        'name' => 'Installation',
                        'description' => 'New plumbing installation',
                        'checklist' => ['Site assessment', 'Material preparation', 'Pipe installation', 'Connection and sealing', 'Pressure test', 'Flow test', 'COC issued'],
                        'custom_fields' => [
                            ['name' => 'Pipe Type', 'type' => 'select', 'options' => ['PVC', 'Copper', 'PEX', 'Galvanized']],
                            ['name' => 'Pipe Diameter', 'type' => 'select', 'options' => ['15mm', '22mm', '28mm', '32mm', '40mm']],
                            ['name' => 'Pressure Test Result', 'type' => 'number', 'unit' => 'bar']
                        ],
                        'estimated_hours' => 4
                    ],
                    [
                        'name' => 'Repair',
                        'description' => 'Plumbing fault repair',
                        'checklist' => ['Isolate water supply', 'Identify leak/fault', 'Repair execution', 'Pressure test', 'Flow test', 'COC issued'],
                        'custom_fields' => [
                            ['name' => 'Leak Location', 'type' => 'text'],
                            ['name' => 'Repair Method', 'type' => 'select', 'options' => ['Patch', 'Replace Section', 'Full Replace']]
                        ],
                        'estimated_hours' => 2
                    ],
                    [
                        'name' => 'Emergency Callout',
                        'description' => 'Emergency plumbing response',
                        'checklist' => ['Emergency assessment', 'Safety measures', 'Temporary fix', 'Permanent repair plan', 'Client notification'],
                        'custom_fields' => [
                            ['name' => 'Emergency Type', 'type' => 'select', 'options' => ['Burst Pipe', 'Blocked Drain', 'Gas Leak', 'Flood', 'Other']],
                            ['name' => 'Response Time', 'type' => 'number', 'unit' => 'minutes']
                        ],
                        'estimated_hours' => 1
                    ]
                ]),
                'custom_fields' => json_encode([
                    ['name' => 'Property Address', 'type' => 'text', 'required' => true],
                    ['name' => 'Client Name', 'type' => 'text'],
                    ['name' => 'Water Meter Number', 'type' => 'text']
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 'general-contractor',
                'name' => 'General Contractor',
                'description' => 'Versatile contractor template for various services',
                'job_types' => json_encode([
                    [
                        'name' => 'Maintenance',
                        'description' => 'General maintenance task',
                        'checklist' => ['Task assessment', 'Material check', 'Execution', 'Quality check', 'Client sign-off'],
                        'custom_fields' => [
                            ['name' => 'Task Type', 'type' => 'select', 'options' => ['Repair', 'Installation', 'Inspection', 'Other']],
                            ['name' => 'Materials Used', 'type' => 'textarea']
                        ],
                        'estimated_hours' => 2
                    ],
                    [
                        'name' => 'Inspection',
                        'description' => 'Site or equipment inspection',
                        'checklist' => ['Safety briefing', 'Visual inspection', 'Detailed assessment', 'Report generation', 'Client review'],
                        'custom_fields' => [
                            ['name' => 'Inspection Type', 'type' => 'select', 'options' => ['Safety', 'Quality', 'Compliance', 'Condition']],
                            ['name' => 'Findings', 'type' => 'textarea']
                        ],
                        'estimated_hours' => 1
                    ]
                ]),
                'custom_fields' => json_encode([
                    ['name' => 'Site Location', 'type' => 'text', 'required' => true],
                    ['name' => 'Client Name', 'type' => 'text'],
                    ['name' => 'Contact Person', 'type' => 'text'],
                    ['name' => 'Contact Phone', 'type' => 'text']
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($templates as $template) {
            DB::table('industry_templates')->updateOrInsert(
                ['id' => $template['id']],
                $template
            );
        }
    }
}
