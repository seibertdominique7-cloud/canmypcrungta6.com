import {
  type ConfidenceLevel,
  createEmptyDetectedSpecs,
  type DetectedHardwareSpecs,
  type HardwareFieldKey,
} from './hardware-types';
import { parseCapacity, type ParsedCapacity } from './capacity';

interface FieldCandidate {
  displayValue: string;
  numericGb: number | null;
  confidence: ConfidenceLevel;
}

export interface HardwareParseResult {
  rawOcrText: string;
  normalizedOcrText: string;
  ramTrace: RamExtractionTrace;
  specs: DetectedHardwareSpecs;
  detectedFieldCount: number;
  hasUsefulText: boolean;
}

export interface RamExtractionTrace {
  rawOcrLine: string | null;
  postProcessedLine: string | null;
  normalizedLine: string | null;
  regexMatch: {
    matchedText: string;
    rawAmount: string;
    unit: string;
  } | null;
  parsedNumber: number | null;
  numericGb: number | null;
  componentValue: string;
}

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const CPU_MODEL_PATTERNS = [
  /(?:\b\d{1,2}(?:st|nd|rd|th)\s+Gen\s+)?Intel(?:\(R\))?\s+(?:Core(?:\(TM\))?\s*)?i[3579][-\s]?\d{4,5}[A-Z]{0,4}/i,
  /AMD\s+Ryzen\s+[3579]\s+\d{4,5}[A-Z0-9]{0,4}/i,
  /Ryzen\s+[3579]\s+\d{4,5}[A-Z0-9]{0,4}/i,
];

const GPU_MODEL_PATTERNS = [
  /NVIDIA\s+(?:GeForce\s+)?(?:RTX|GTX)\s*\d{3,4}\s*(?:Ti|SUPER)?/i,
  /(?:GeForce\s+)?(?:RTX|GTX)\s*\d{3,4}\s*(?:Ti|SUPER)?/i,
  /AMD\s+(?:Radeon\s+)?RX\s*\d{4}\s*(?:XT)?/i,
  /(?:Radeon\s+)?RX\s*\d{4}\s*(?:XT)?/i,
  /(?:AMD\s+)?Radeon\s+\d{3,4}[A-Z]?\s+Graphics\b/i,
  /(?:AMD\s+)?Radeon\s+Graphics\b/i,
  /Intel\s+Iris\s+Xe\s+Graphics\b/i,
  /Intel\s+UHD(?:\s+\d{2,4})?\s+Graphics\b/i,
];

const STORAGE_KEYWORD_PATTERN =
  /\b(storage|disk|drive|ssd|hdd|nvme|hard disk|solid state|capacity)\b/i;

const MEMORY_EXCLUSION_PATTERN = /\b(memory|ram|vram|cache|graphics|gpu)\b/i;

const RAM_LABEL_PATTERNS = [
  /^Installed Physical Memory(?: \(RAM\))?\b/i,
  /^Installed RAM\b/i,
  /^Total Physical Memory\b/i,
  /^RAM\b/i,
  /^Memory\b/i,
];

export function parseHardwareSpecs(ocrText: string): HardwareParseResult {
  const text = normalizeOcrText(ocrText);
  const lines = getUsefulLines(text);
  const specs = createEmptyDetectedSpecs();
  const ramExtraction = extractRam(ocrText, lines);

  setField(specs, 'manufacturer', extractManufacturer(lines));
  setField(specs, 'model', extractModel(lines));
  setField(specs, 'cpu', extractCpu(text, lines));
  setField(specs, 'gpu', extractGpu(text, lines));
  setField(specs, 'ram', ramExtraction.field);
  setField(specs, 'windowsVersion', extractWindowsVersion(text, lines));

  const storage = extractStorage(lines);
  setField(specs, 'storage', storage.storage);
  setField(specs, 'storageType', storage.storageType);

  const detectedFieldCount = Object.values(specs).filter((field) => field.displayValue).length;

  return {
    rawOcrText: ocrText,
    normalizedOcrText: text,
    ramTrace: ramExtraction.trace,
    specs,
    detectedFieldCount,
    hasUsefulText: text.length >= 40 && detectedFieldCount >= 2,
  };
}

function normalizeOcrText(text: string) {
  // Keep punctuation intact here. In particular, periods and commas between
  // digits are meaningful decimal separators and must reach numeric parsing.
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[|]+/g, ' ')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function getUsefulLines(text: string) {
  return text
    .split('\n')
    .map((line) => cleanValue(line))
    .filter((line) => line.length > 0);
}

function setField(
  specs: DetectedHardwareSpecs,
  key: HardwareFieldKey,
  candidate: FieldCandidate | null,
) {
  if (!candidate?.displayValue) {
    return;
  }

  if (CONFIDENCE_RANK[candidate.confidence] >= CONFIDENCE_RANK[specs[key].confidence]) {
    specs[key] = candidate;
  }
}

function candidate(
  displayValue: string,
  confidence: ConfidenceLevel,
  numericGb: number | null = null,
): FieldCandidate | null {
  const cleaned = cleanValue(displayValue);

  if (!cleaned) {
    return null;
  }

  return {
    displayValue: cleaned,
    numericGb,
    confidence,
  };
}

function cleanValue(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[\s:=-]+/, '')
    .replace(/[\s:=-]+$/, '')
    .trim();
}

function valueAfterLabel(line: string) {
  const parts = line.split(/\s*[:\t]\s*/);

  if (parts.length > 1) {
    return cleanValue(parts.slice(1).join(' '));
  }

  return cleanValue(
    line.replace(
      /^(OS Name|Edition|Version|Processor|CPU|Name|Card name|GPU|Display|Adapter|Installed RAM|Installed Physical Memory(?: \(RAM\))?|Total Physical Memory|RAM|Memory|System Manufacturer|Manufacturer|System Model|Model|System Product Name|Product Name|System SKU)\s*/i,
      '',
    ),
  );
}

function findLabeledLine(lines: string[], labels: RegExp[]) {
  return lines.find((line) => labels.some((label) => label.test(line))) ?? null;
}

function extractManufacturer(lines: string[]) {
  const line = findLabeledLine(lines, [
    /^System Manufacturer\b/i,
    /^Manufacturer\b/i,
    /^System Vendor\b/i,
  ]);

  return line ? candidate(valueAfterLabel(line), 'high') : null;
}

function extractModel(lines: string[]) {
  const line = findLabeledLine(lines, [
    /^System Model\b/i,
    /^System Product Name\b/i,
    /^Product Name\b/i,
    /^Model\b/i,
  ]);

  return line ? candidate(valueAfterLabel(line), 'high') : null;
}

function extractCpu(text: string, lines: string[]) {
  const labeledLine = findLabeledLine(lines, [
    /^Processor\b/i,
    /^CPU\b/i,
    /^Name\b.*\b(Intel|AMD|Ryzen|Core)\b/i,
  ]);

  if (labeledLine) {
    const model = findFirstMatch(valueAfterLabel(labeledLine), CPU_MODEL_PATTERNS);
    return candidate(model ?? valueAfterLabel(labeledLine), model ? 'high' : 'medium');
  }

  const textMatch = findFirstMatch(text, CPU_MODEL_PATTERNS);

  if (textMatch) {
    return candidate(normalizeCpuName(textMatch), 'medium');
  }

  return null;
}

function extractGpu(text: string, lines: string[]) {
  const labeledLine = findLabeledLine(lines, [
    /^Card name\b/i,
    /^Display(?: Adapter)?\b/i,
    /^Adapter\b/i,
    /^GPU\b/i,
    /^Graphics(?: Card| Adapter)?\b/i,
  ]);

  if (labeledLine) {
    const model = findFirstMatch(valueAfterLabel(labeledLine), GPU_MODEL_PATTERNS);

    if (model) {
      return candidate(normalizeGpuName(model), 'high');
    }
  }

  const textMatch = findFirstMatch(text, GPU_MODEL_PATTERNS);

  if (textMatch) {
    return candidate(normalizeGpuName(textMatch), 'medium');
  }

  return null;
}

function extractRam(rawOcrText: string, lines: string[]) {
  const preferredLine = findLabeledLine(lines, RAM_LABEL_PATTERNS);

  if (preferredLine) {
    const capacity = extractCapacity(preferredLine);

    if (capacity) {
      const field = candidate(capacity.displayValue, 'high', capacity.numericGb);
      return {
        field,
        trace: createRamTrace(rawOcrText, preferredLine, capacity, field),
      };
    }
  }

  const memoryLine = lines.find(
    (line) => /\b(memory|ram)\b/i.test(line) && extractCapacity(line) !== null,
  );

  if (!memoryLine) {
    return {
      field: null,
      trace: createRamTrace(rawOcrText, preferredLine, null, null),
    };
  }

  const capacity = extractCapacity(memoryLine);
  const field = capacity
    ? candidate(capacity.displayValue, 'medium', capacity.numericGb)
    : null;
  return {
    field,
    trace: createRamTrace(rawOcrText, memoryLine, capacity, field),
  };
}

function extractStorage(lines: string[]) {
  const storageLines = lines.filter(
    (line) => STORAGE_KEYWORD_PATTERN.test(line) && !MEMORY_EXCLUSION_PATTERN.test(line),
  );
  const storageCandidates = storageLines
    .map((line) => ({
      line,
      capacity: extractCapacity(line),
      type: detectStorageType(line),
    }))
    .filter((item) => item.capacity !== null || item.type !== null);
  const largestCapacity = storageCandidates
    .filter(
      (item): item is {
        line: string;
        capacity: ParsedCapacity;
        type: StorageKind | null;
      } => item.capacity !== null,
    )
    .sort((left, right) => right.capacity.numericGb - left.capacity.numericGb)[0];
  const storageType = detectStorageType(lines.join(' '));

  if (!largestCapacity && !storageType) {
    return {
      storage: null,
      storageType: null,
    };
  }

  const capacity = largestCapacity?.capacity ?? null;

  return {
    storage: capacity
      ? candidate(capacity.displayValue, 'high', capacity.numericGb)
      : null,
    storageType: storageType ? candidate(formatStorageType(storageType), storageType === 'unknown' ? 'low' : 'medium') : null,
  };
}

function extractWindowsVersion(text: string, lines: string[]) {
  const labeledLine = findLabeledLine(lines, [
    /^OS Name\b/i,
    /^Edition\b/i,
    /^Windows Version\b/i,
    /^Operating System\b/i,
  ]);

  if (labeledLine) {
    const windowsMatch = findWindowsMatch(labeledLine);
    return candidate(windowsMatch ?? valueAfterLabel(labeledLine), windowsMatch ? 'high' : 'medium');
  }

  const textMatch = findWindowsMatch(text);
  return textMatch ? candidate(textMatch, 'medium') : null;
}

function findWindowsMatch(text: string) {
  return text.match(/Windows\s+(?:10|11)(?:\s+(?:Home|Pro|Enterprise|Education))?/i)?.[0] ?? null;
}

function findFirstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)?.[0];

    if (match) {
      return match;
    }
  }

  return null;
}

function normalizeCpuName(value: string) {
  const cleaned = value
    .replace(/\(R\)|\(TM\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^Ryzen/i.test(cleaned)) {
    return `AMD ${cleaned}`;
  }

  return cleaned;
}

function normalizeGpuName(value: string) {
  const cleaned = value.replace(/\s+/g, ' ').trim();

  if (/^(RTX|GTX|GeForce)/i.test(cleaned)) {
    return `NVIDIA ${cleaned.replace(/^GeForce\s+/i, '')}`;
  }

  if (/^Radeon\s+RX/i.test(cleaned)) {
    return `AMD ${cleaned.replace(/^Radeon\s+/i, '')}`;
  }

  if (/^(RX|Radeon)/i.test(cleaned)) {
    return `AMD ${cleaned}`;
  }

  return cleaned;
}

function extractCapacity(line: string) {
  return parseCapacity(line);
}

function createRamTrace(
  rawOcrText: string,
  normalizedLine: string | null,
  capacity: ParsedCapacity | null,
  field: FieldCandidate | null,
): RamExtractionTrace {
  const rawOcrLine = normalizedLine ? findRawSourceLine(rawOcrText, normalizedLine) : null;

  return {
    rawOcrLine,
    postProcessedLine: rawOcrLine ? normalizeOcrText(rawOcrLine) : null,
    normalizedLine,
    regexMatch: capacity
      ? {
          matchedText: capacity.matchedText,
          rawAmount: capacity.rawAmount,
          unit: capacity.unit,
        }
      : null,
    parsedNumber: capacity?.numericAmount ?? null,
    numericGb: capacity?.numericGb ?? null,
    componentValue: field?.displayValue ?? '',
  };
}

function findRawSourceLine(rawOcrText: string, normalizedLine: string) {
  return (
    rawOcrText
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .find((line) => cleanValue(normalizeOcrText(line)) === normalizedLine)
      ?.trim() ?? normalizedLine
  );
}

type StorageKind = 'hdd' | 'ssd' | 'nvme' | 'unknown';

function detectStorageType(text: string): StorageKind | null {
  if (/\bNVMe\b/i.test(text)) {
    return 'nvme';
  }

  if (/\bSSD\b|solid state/i.test(text)) {
    return 'ssd';
  }

  if (/\bHDD\b|hard disk|hard drive/i.test(text)) {
    return 'hdd';
  }

  return null;
}

function formatStorageType(type: StorageKind) {
  if (type === 'nvme') {
    return 'NVMe SSD';
  }

  if (type === 'ssd') {
    return 'SSD';
  }

  if (type === 'hdd') {
    return 'HDD';
  }

  return '';
}
