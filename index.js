import { chat_metadata } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { executeSlashCommands, registerSlashCommand } from '../../../slash-commands.js';
import { isTrueBoolean } from '../../../utils.js';



/**
 * Parses boolean operands from command arguments.
 * @param {object} args Command arguments
 * @returns {{a: string | number, b: string | number, rule: string}} Boolean operands
 */
function parseBooleanOperands(args) {
    // Resolution order: numeric literal, local variable, global variable, string literal
    /**
     * @param {string} operand Boolean operand candidate
     */
    function getOperand(operand) {
        if (operand === undefined) {
            return '';
        }

        const operandNumber = Number(operand);

        if (!isNaN(operandNumber)) {
            return operandNumber;
        }

        if (chat_metadata?.variables?.[operand] !== undefined) {
            const operandLocalVariable = chat_metadata.variables[operand];
            return operandLocalVariable ?? '';
        }

        if (extension_settings?.variables?.[operand] !== undefined) {
            const operandGlobalVariable = extension_settings.variables[operand];
            return operandGlobalVariable ?? '';
        }

        const stringLiteral = String(operand);
        return stringLiteral || '';
    }

    const left = getOperand(args.a || args.left || args.first || args.x);
    const right = getOperand(args.b || args.right || args.second || args.y);
    const rule = args.rule;

    return { a: left, b: right, rule };
}

/**
 * Evaluates a boolean comparison rule.
 * @param {string} rule Boolean comparison rule
 * @param {string|number} a The left operand
 * @param {string|number} b The right operand
 * @returns {boolean} True if the rule yields true, false otherwise
 */
function evalBoolean(rule, a, b) {
    if (!rule) {
        toastr.warning('The rule must be specified for the boolean comparison.', 'Invalid command');
        throw new Error('Invalid command.');
    }

    let result = false;

    if (typeof a === 'string' && typeof b !== 'number') {
        const aString = String(a).toLowerCase();
        const bString = String(b).toLowerCase();

        switch (rule) {
            case 'in':
                result = aString.includes(bString);
                break;
            case 'nin':
                result = !aString.includes(bString);
                break;
            case 'eq':
                result = aString === bString;
                break;
            case 'neq':
                result = aString !== bString;
                break;
            default:
                toastr.error('Unknown boolean comparison rule for type string.', 'Invalid /if command');
                throw new Error('Invalid command.');
        }
    } else if (typeof a === 'number') {
        const aNumber = Number(a);
        const bNumber = Number(b);

        switch (rule) {
            case 'not':
                result = !aNumber;
                break;
            case 'gt':
                result = aNumber > bNumber;
                break;
            case 'gte':
                result = aNumber >= bNumber;
                break;
            case 'lt':
                result = aNumber < bNumber;
                break;
            case 'lte':
                result = aNumber <= bNumber;
                break;
            case 'eq':
                result = aNumber === bNumber;
                break;
            case 'neq':
                result = aNumber !== bNumber;
                break;
            default:
                toastr.error('Unknown boolean comparison rule for type number.', 'Invalid command');
                throw new Error('Invalid command.');
        }
    }

    return result;
}


function getListVar(local, global, literal) {
    let list;
    if (local) {
        try {
            list = JSON.parse(chat_metadata?.variables?.[local]);
        } catch { /* empty */ }
    }
    if (!list && global) {
        try {
            list = JSON.parse(extension_settings.variables?.global?.[global]);
        } catch { /* empty */ }
    }
    if (!list && literal) {
        if (typeof literal == 'string') {
            try {
                list = JSON.parse(literal);
            } catch { /* empty */ }
        } else if (typeof literal == 'object') {
            list = literal;
        }
    }
    return list;
}




registerSlashCommand(
    'test',
    (args)=>{
        const { a, b, rule } = parseBooleanOperands(args);
        return evalBoolean(rule, a, b);
    },
    [],
    '<span class="monospace">left=val rule=rule right=val</span> – Returns true or false, depending on whether left and right adhere to rule. Available rules: gt => a > b, gte => a >= b, lt => a < b, lte => a <= b, eq => a == b, neq => a != b, not => !a, in (strings) => a includes b, nin (strings) => a not includes b',
    true,
    true,
);

registerSlashCommand(
    'and',
    (args)=>{
        let left = args.left;
        try { left = JSON.parse(args.left); } catch { /* empty */ }
        let right = args.right;
        try { right = JSON.parse(args.right); } catch { /* empty */ }
        return (left && right) == true;
    },
    [],
    '<span class="monospace">left=val right=val</span> – Returns true if both left and right are true, otherwise false.',
    true,
    true,
);

registerSlashCommand(
    'or',
    (args)=>{
        let left = args.left;
        try { left = JSON.parse(args.left); } catch { /* empty */ }
        let right = args.right;
        try { right = JSON.parse(args.right); } catch { /* empty */ }
        return (left || right) == true;
    },
    [],
    '<span class="monospace">left=val right=val</span> – Returns true if at least one of left and right are true, false if both are false.',
    true,
    true,
);

registerSlashCommand(
    'not',
    (args, value)=>{
        return value != true;
    },
    [],
    '<span class="monospace">(value)</span> – Returns true if value is false, otherwise true.',
    true,
    true,
);


registerSlashCommand(
    'foreach',
    async(args, value)=>{
        let list = getListVar(args.var, args.globalvar, args.list);
        let result;
        if (!Array.isArray(list) && typeof list == 'object') {
            list = Object.keys(list).map(key=>list[key]);
        }
        if (Array.isArray(list)) {
            for (let item of list) {
                if (typeof item == 'object') {
                    item = JSON.stringify(item);
                }
                result = await executeSlashCommands(value.replace(/{{item}}/ig, item));
            }
            return result;
        }

        if (typeof result == 'object') {
            result = JSON.stringify(result);
        }
        return result;
    },
    [],
    '<span class="monospace">[optional list=[1,2,3]] [optional var=varname] [optional globalvar=globalvarname] (/command {{item}})</span> – Executes command for each item of a list or dictionary.',
    true,
    true,
);


registerSlashCommand(
    'join',
    (args, value)=>{
        let list = getListVar(args.var, args.globalvar, value);
        if (Array.isArray(list)) {
            return list.join(args.glue ?? ', ');
        }
    },
    [],
    '<span class="monospace">[optional glue=", "] [optional var=varname] [optional globalvar=globalvarname] (optional list)</span> – Joins the items of a list with glue into a single string.',
    true,
    true,
);

registerSlashCommand(
    'split',
    (args, value)=>{
        return JSON.stringify(value.split(args.find ?? ',').map(it=>isTrueBoolean(args.trim ?? true) ? it.trim() : it));
    },
    [],
    '<span class="monospace">[optional find=","] [optional trim=true|false] (value)</span> – Splits value into list at every occurrence of find.',
    true,
    true,
);
