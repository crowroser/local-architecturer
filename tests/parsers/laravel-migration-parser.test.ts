import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LaravelMigrationParser } from '../../src/parsers/laravel-migration-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('LaravelMigrationParser', () => {
  let parser: LaravelMigrationParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'laravel-migration-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new LaravelMigrationParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no migration files exist', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse valid Laravel migration files', async () => {
    await fs.mkdir(path.join(tempDir, 'database', 'migrations'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'database', 'migrations', '2024_01_01_000000_create_users_table.php'),
      `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->string('email')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
`
    );

    await fs.writeFile(
      path.join(tempDir, 'database', 'migrations', '2024_01_01_000001_create_posts_table.php'),
      `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('title');
            $table->text('body')->nullable();
            $table->foreignId('user_id')->constrained();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('laravel');
    expect(result[0].name).toBe('laravel');
    expect(result[0].tables.length).toBe(2);

    const usersTable = result[0].tables.find(t => t.name === 'users');
    expect(usersTable).toBeDefined();
    expect(usersTable!.columns.length).toBeGreaterThanOrEqual(4);

    const idCol = usersTable!.columns.find(c => c.name === 'id');
    expect(idCol).toBeDefined();
    expect(idCol!.isPrimaryKey).toBe(true);

    const postsTable = result[0].tables.find(t => t.name === 'posts');
    expect(postsTable).toBeDefined();
  });

  it('should extract timestamps columns', async () => {
    await fs.mkdir(path.join(tempDir, 'database', 'migrations'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'database', 'migrations', '2024_01_01_create_users.php'),
      `<?php
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->timestamps();
        });
    }
};
`
    );

    const result = await parser.parseAll();
    const usersTable = result[0].tables.find(t => t.name === 'users');
    const createdAt = usersTable!.columns.find(c => c.name === 'created_at');
    const updatedAt = usersTable!.columns.find(c => c.name === 'updated_at');
    expect(createdAt).toBeDefined();
    expect(updatedAt).toBeDefined();
  });

  it('should extract soft deletes column', async () => {
    await fs.mkdir(path.join(tempDir, 'database', 'migrations'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'database', 'migrations', '2024_01_01_create_users.php'),
      `<?php
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->softDeletes();
        });
    }
};
`
    );

    const result = await parser.parseAll();
    const usersTable = result[0].tables.find(t => t.name === 'users');
    const deletedAt = usersTable!.columns.find(c => c.name === 'deleted_at');
    expect(deletedAt).toBeDefined();
  });

  it('should extract foreign key relations', async () => {
    await fs.mkdir(path.join(tempDir, 'database', 'migrations'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'database', 'migrations', '2024_01_01_create_posts.php'),
      `<?php
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->integer('user_id');
            $table->foreign('user_id')->references('id')->on('users');
        });
    }
};
`
    );

    const result = await parser.parseAll();
    expect(result[0].relations.length).toBe(1);
    expect(result[0].relations[0].from.table).toBe('posts');
    expect(result[0].relations[0].to.table).toBe('users');
  });

  it('should extract nullable and unique modifiers', async () => {
    await fs.mkdir(path.join(tempDir, 'database', 'migrations'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'database', 'migrations', '2024_01_01_create_users.php'),
      `<?php
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('email')->unique();
            $table->string('bio')->nullable();
        });
    }
};
`
    );

    const result = await parser.parseAll();
    const usersTable = result[0].tables.find(t => t.name === 'users');
    const emailCol = usersTable!.columns.find(c => c.name === 'email');
    expect(emailCol!.isUnique).toBe(true);
    const bioCol = usersTable!.columns.find(c => c.name === 'bio');
    expect(bioCol!.isNullable).toBe(true);
  });

  it('should handle Schema::table (alter) without creating new table', async () => {
    await fs.mkdir(path.join(tempDir, 'database', 'migrations'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'database', 'migrations', '2024_01_02_add_column.php'),
      `<?php
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone');
        });
    }
};
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(0);
  });

  it('should map Laravel types correctly', async () => {
    await fs.mkdir(path.join(tempDir, 'database', 'migrations'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'database', 'migrations', '2024_01_01_create_data.php'),
      `<?php
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('data', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->bigInteger('big_num');
            $table->float('score');
            $table->double('precise');
            $table->decimal('money');
            $table->boolean('flag');
            $table->date('birth_date');
            $table->dateTime('created_at');
            $table->json('metadata');
            $table->uuid('uuid');
        });
    }
};
`
    );

    const result = await parser.parseAll();
    const dataTable = result[0].tables.find(t => t.name === 'data');
    expect(dataTable).toBeDefined();
    expect(dataTable!.columns.length).toBe(10);

    expect(dataTable!.columns.find(c => c.name === 'id')!.type).toBe('bigint');
    expect(dataTable!.columns.find(c => c.name === 'big_num')!.type).toBe('bigint');
    expect(dataTable!.columns.find(c => c.name === 'score')!.type).toBe('float');
    expect(dataTable!.columns.find(c => c.name === 'precise')!.type).toBe('double');
    expect(dataTable!.columns.find(c => c.name === 'money')!.type).toBe('decimal');
    expect(dataTable!.columns.find(c => c.name === 'flag')!.type).toBe('boolean');
    expect(dataTable!.columns.find(c => c.name === 'birth_date')!.type).toBe('date');
    expect(dataTable!.columns.find(c => c.name === 'metadata')!.type).toBe('json');
    expect(dataTable!.columns.find(c => c.name === 'uuid')!.type).toBe('uuid');
  });
});
