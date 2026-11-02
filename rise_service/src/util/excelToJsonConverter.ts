// src/utils/excelToJsonConverter.ts
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const DOCUMENTS_DIR = path.resolve(__dirname, '../../document');
const JSON_OUTPUT_DIR = path.resolve(__dirname, '../../json');

// 核心转换函数
const convertExcelToJson = (inputPath: string, outputPath: string) => {
    try {
        const workbook = XLSX.readFile(inputPath);
        const result: { [sheetName: string]: any[] } = {};

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];

            // 获取第二行作为key
            const headerRange = XLSX.utils.decode_range(worksheet['!ref']!);
            const headerRow = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                range: XLSX.utils.encode_range({
                    s: { r: 1, c: 0 }, // 从第二行开始（索引从0开始）
                    e: { r: 1, c: headerRange.e.c }
                }),
                raw: true
            })[0] as string[];

            // 转换数据（从第三行开始）
            const data = XLSX.utils.sheet_to_json(worksheet, {
                header: headerRow,
                range: 2, // 跳过前两行
                rawNumbers: true,
                dateNF: 'yyyy-mm-dd'
            });

            result[sheetName] = data;
        });

        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`✅ 转换成功: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
        return true;
    } catch (error) {
        console.error(`❌ 转换失败: ${path.basename(inputPath)}`, error);
        return false;
    }
};

// 批量处理文档目录
export async function batchConvertDocuments() {
    // 确保输出目录存在
    if (!fs.existsSync(JSON_OUTPUT_DIR)) {
        fs.mkdirSync(JSON_OUTPUT_DIR, { recursive: true });
    }

    // 修改文件过滤逻辑（添加排除.~开头的文件）
    const files = fs.readdirSync(DOCUMENTS_DIR)
        .filter(file =>
            path.extname(file) === '.xlsx' &&
            !file.startsWith('.~')  // 新增排除规则
        );

    if (files.length === 0) {
        console.log('ℹ️ 未找到可转换的Excel文件');
        return;
    }

    // 执行批量转换
    console.log(`🔄 开始转换 ${files.length} 个文件`);

    const results = files.map(file => {
        const inputPath = path.join(DOCUMENTS_DIR, file);
        const outputName = `${path.parse(file).name}.json`;
        const outputPath = path.join(JSON_OUTPUT_DIR, outputName);

        return convertExcelToJson(inputPath, outputPath);
    });

    // 输出统计结果
    const successCount = results.filter(Boolean).length;
    console.log(`🎉 转换完成 (成功: ${successCount}, 失败: ${files.length - successCount})`);
};

// 在mainServer.ts中调用示例
/*
import { batchConvertDocuments } from './utils/excelToJsonConverter';
import { async } from '../../../rise_queue/src/network/proxyMiddleware';

// 启动时自动转换
batchConvertDocuments();
*/