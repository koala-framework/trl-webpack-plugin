declare const UNIQUE_PREFIX: string;
type trlSource = 'web' | 'kwf';
type trlValues = string | number | Array<string | number>;
interface IKwfTrlData {
    source: trlSource;
    data: {
        [key: string]: string
    }
}

const getTrlData = (source: trlSource, text: string): string | null => {
    let ret = null;
    if (!(window as any)[UNIQUE_PREFIX + "kwfTrlData"]) return ret;
    (window as any)[UNIQUE_PREFIX + "kwfTrlData"].forEach((kwfTrlData: IKwfTrlData) => {
        if (kwfTrlData.source === source && kwfTrlData.data[text]) {
            ret = kwfTrlData.data[text];
            return false;
        }
    });
    return ret;
};

const replaceValues = (text: string, values: trlValues): string => {
    if (!values) return text;
    if (typeof values === "string" || typeof values === "number") {
        values = [values];
    }

    let cnt = 0;
    values.forEach((value) => {
        text = text.replace(new RegExp("\\{(" + cnt + ")\\}", "g"), value as string);
        cnt++;
    });
    return text;
};

const trl = (source: trlSource, text: string, values: trlValues): string => {
    const ret = getTrlData(source, text) || text;
    return replaceValues(ret, values);
};

const trlc = (source: trlSource, context: string, text: string, values: trlValues) => {
    const ret = getTrlData(source, `${context}__${text}`) || text;
    return replaceValues(ret, values);
};

const trlp = (source: trlSource, singularText: string, pluralText: string, values: trlValues): string => {
    const ret = getTrlData(source, `${singularText}--${pluralText}`) || [singularText, pluralText];
    const count = (values instanceof Array) ? values[0] : values;
    return replaceValues((count === 1) ? ret[0] : ret[1], values);
};
const trlcp = (source: trlSource, context: string, singularText: string, pluralText: string, values: trlValues): string => {
    const ret = getTrlData(source, `${context}__${singularText}--${pluralText}`) || [singularText, pluralText];
    const count = (values instanceof Array) ? values[0] : values;
    return replaceValues((count === 1) ? ret[0] : ret[1], values);
};

export default {
    trl: (text: string, values?: trlValues): string => {
        return trl("web", text, values);
    },
    trlc: (context: string, text: string, values?: trlValues): string => {
        return trlc("web", context, text, values);
    },
    trlp: (singularText: string, pluralText: string, values: trlValues): string => {
        return trlp("web", singularText, pluralText, values);
    },
    trlcp: (context: string, singularText: string, pluralText: string, values: trlValues): string => {
        return trlcp("web", context, singularText, pluralText, values);
    },
    trlKwf: (text: string, values?: trlValues): string => {
        return trl("kwf", text, values);
    },
    trlcKwf: (context: string, text: string, values?: trlValues): string => {
        return trlc("kwf", context, text, values);
    },
    trlpKwf: (singularText: string, pluralText: string, values: trlValues): string => {
        return trlp("kwf", singularText, pluralText, values);
    },
    trlcpKwf: (context: string, singularText: string, pluralText: string, values: trlValues): string => {
        return trlcp("kwf", context, singularText, pluralText, values);
    },
};
