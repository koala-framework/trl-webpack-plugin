import * as webpack from "webpack";

export default (expr: any, parser: webpack.ParserOptions) => {
    let source = "web";
    let trlFunction = expr.callee.name;
    if (trlFunction.substr(0, 2) === "__") trlFunction = trlFunction.substr(2);
    if (trlFunction.substr(-3) === "Kwf") {
        trlFunction = trlFunction.substr(0, trlFunction.length - 3);
        source = "kwf";
    }

    const ret = [];
    if (trlFunction === "trlc") {
        if (expr.arguments.length >= 2) {
            const first = parser.evaluateExpression(expr.arguments[0]);
            const second = parser.evaluateExpression(expr.arguments[1]);
            if (first.isString() && second.isString()) {
                ret.push({
                    source,
                    context: first.string,
                    text: second.string,
                });
            }
        }
    } else if (trlFunction === "trlp") {
        if (expr.arguments.length >= 2) {
            const first = parser.evaluateExpression(expr.arguments[0]);
            const second = parser.evaluateExpression(expr.arguments[1]);
            if (first.isString() && second.isString()) {
                ret.push({
                    source,
                    context: "",
                    text: first.string,
                    plural: second.string,
                });
            }
        }
    } else if (trlFunction === "trlcp") {
        if (expr.arguments.length >= 3) {
            const first = parser.evaluateExpression(expr.arguments[0]);
            const second = parser.evaluateExpression(expr.arguments[1]);
            const third = parser.evaluateExpression(expr.arguments[2]);
            if (first.isString() && second.isString() && third.isString()) {
                ret.push({
                    source,
                    context: first.string,
                    text: second.string,
                    plural: third.string,
                });
            }
        }
    } else if (trlFunction === "trl") {
        if (expr.arguments.length >= 1) {
            const first = parser.evaluateExpression(expr.arguments[0]);
            ret.push({
                source,
                context: "",
                text: first.string,
            });
        }
    }

    return ret;
};
