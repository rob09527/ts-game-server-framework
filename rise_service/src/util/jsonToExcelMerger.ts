// src/utils/jsonLoader.ts
import { readFileSync, readdirSync } from 'fs';
import path, { resolve, parse } from 'path';

const JSON_OUTPUT_DIR = path.resolve(__dirname, '../../json');
export async function loadJsonFiles(folderPath: string = JSON_OUTPUT_DIR) {
    const jsonPath = resolve(__dirname, folderPath);
    const result: Record<string, any> = {};

    try {
        const files = readdirSync(jsonPath);

        files.forEach(file => {
            if (!file.endsWith('.json')) return;

            const { name } = parse(file);
            try {
                const content = readFileSync(resolve(jsonPath, file), 'utf8');
                result[name] = JSON.parse(content);
            } catch (error) {
                console.error(`⚠️ 加载失败: ${file}`, error);
            }
        });

    } catch (error) {
        console.error('❌ 目录读取失败:', error);
    }

    return result;
};