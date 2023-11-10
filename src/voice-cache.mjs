import { createHash } from "crypto";
import { pollySynth, speechMarks } from "./polly-module.mjs";

const DEFAULT_CACHE_SIZE = 3145728; // 3 MB
export const VoiceCache = (maxCacheSize = DEFAULT_CACHE_SIZE) => {
    const cacheMap = new Map();
    let cacheSize = 0;
    const makeHash = (phrase, type, voiceId = "") =>
        createHash("md5").update(`${phrase}${type}${voiceId}`).digest("hex");
    const cleanCache = candidateSize => {
        let newSize = cacheSize + candidateSize;
        if (newSize > maxCacheSize) {
            const line = Array.from(cacheMap, ([hash, { size, timestamp }]) => ({ hash, size, timestamp })).sort(
                ({ timestamp: ts1 }, { timestamp: ts2 }) => ts1 - ts2
            );

            for (let i = 0; i < line.length; i++) {
                const { size, hash } = line[i];
                cacheMap.delete(hash);
                newSize -= size;
                if (newSize < maxCacheSize) {
                    break;
                }
            }
        }
    };
    const generate = async ({ phrase, type, useMarks = false, voiceId }) => {
        const hash = makeHash(phrase, type, voiceId);
        let voiceDataObject = cacheMap.get(hash);

        if (!voiceDataObject) {
            const tasks = [() => pollySynth({ phrase, type, voiceId })];

            if (useMarks) {
                tasks.push(() => speechMarks({ phrase, voiceId }));
            }

            const voiceData = await Promise.all(tasks.map(task => task()));

            const size = voiceData.reduce((acc, { size }) => acc + size, 0);

            const [voice, marks] = voiceData;

            const { stream } = marks;
            const markArray = stream
                .toString("utf-8")
                .split("\n")
                .filter(item => item)
                .map(item => JSON.parse(item));

            voiceDataObject = [voice, markArray];

            cleanCache(size);
            cacheSize += size;
            cacheMap.set(hash, voiceDataObject);
        }

        const [voice, markArray] = voiceDataObject;

        return { voice, marks: markArray, hash };
    };

    const get = hash => cacheMap.get(hash);

    return {
        generate,
        get
    };
};

export const cache = VoiceCache();
