<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FixGroupFieldSpecsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:group-field-specs {--dry-run : Show what would be fixed without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix group_field_specs table issues with invalid field_spec_id values';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        $this->info('Checking group_field_specs table for issues...');
        
        // 1. Check for field_spec_id = 0
        $zeroEntries = DB::table('group_field_specs')->where('field_spec_id', 0)->count();
        if ($zeroEntries > 0) {
            $this->warn("Found {$zeroEntries} entries with field_spec_id = 0");
            if (!$dryRun) {
                DB::table('group_field_specs')->where('field_spec_id', 0)->delete();
                $this->info("Deleted {$zeroEntries} entries with field_spec_id = 0");
            }
        }
        
        // 2. Check for invalid foreign key references
        $invalidEntries = DB::table('group_field_specs as gfs')
            ->leftJoin('document_field_specs as dfs', 'gfs.field_spec_id', '=', 'dfs.id')
            ->whereNotNull('gfs.field_spec_id')
            ->whereNull('dfs.id')
            ->select('gfs.*')
            ->get();
            
        if ($invalidEntries->count() > 0) {
            $this->warn("Found {$invalidEntries->count()} entries with invalid field_spec_id references");
            foreach ($invalidEntries as $entry) {
                $this->line("  - Group {$entry->group_id}, Document Type {$entry->document_type_id}, Invalid Field {$entry->field_spec_id}");
            }
            
            if (!$dryRun) {
                $deleted = DB::table('group_field_specs as gfs')
                    ->leftJoin('document_field_specs as dfs', 'gfs.field_spec_id', '=', 'dfs.id')
                    ->whereNotNull('gfs.field_spec_id')
                    ->whereNull('dfs.id')
                    ->delete();
                $this->info("Deleted {$deleted} entries with invalid foreign key references");
            }
        }
        
        // 3. Show statistics
        $totalEntries = DB::table('group_field_specs')->count();
        $nullEntries = DB::table('group_field_specs')->whereNull('field_spec_id')->count();
        $validEntries = DB::table('group_field_specs')
            ->join('document_field_specs', 'group_field_specs.field_spec_id', '=', 'document_field_specs.id')
            ->count();
            
        $this->info("\nTable statistics:");
        $this->line("  Total entries: {$totalEntries}");
        $this->line("  NULL field_spec_id: {$nullEntries}");
        $this->line("  Valid field_spec_id: {$validEntries}");
        
        if ($dryRun) {
            $this->warn("\nThis was a dry run. Use without --dry-run to apply changes.");
        } else {
            $this->info("\nCleanup completed successfully!");
        }
        
        return Command::SUCCESS;
    }
}