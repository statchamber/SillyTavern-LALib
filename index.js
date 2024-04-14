import { callPopup, characters, chat, chat_metadata, eventSource, event_types, getRequestHeaders, reloadMarkdownProcessor, sendSystemMessage } from '../../../../script.js';
import { getMessageTimeStamp } from '../../../RossAscends-mods.js';
import { extension_settings, getContext } from '../../../extensions.js';
import { findGroupMemberId, groups, selected_group } from '../../../group-chats.js';
import { executeSlashCommands, registerSlashCommand } from '../../../slash-commands.js';
import { debounce, delay, isTrueBoolean } from '../../../utils.js';
import { world_info } from '../../../world-info.js';
import { quickReplyApi } from '../../quick-reply/index.js';



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

function getVar(local, global, literal) {
    let value;
    if (local) {
        value = chat_metadata?.variables?.[local];
    }
    if (value === undefined && global) {
        value = extension_settings.variables?.global?.[global];
    }
    if (value === undefined && literal) {
        value = literal;
    }
    return value;
}


class Command {
    /**@type {String} */ command;
    /**@type {String} */ args;
    /**@type {String} */ helpText;
    constructor(command, helpText) {
        this.command = command;
        this.args = helpText.split(' – ')[0];
        this.helpText = helpText.split(/(?=– )/)[1];
    }
}
/**@type {Command[]} */
const commandList = [];

/**
 * registerSlashCommand
 * @param {String} command
 * @param {Function} callback
 * @param {String[]} aliasList
 * @param {String} helpText
 * @param {Boolean} a
 * @param {Boolean} b
 */
const rsc = (command, callback, aliasList, helpText, a = true, b = true)=>{
    registerSlashCommand(command, callback, aliasList, helpText, a, b);
    commandList.push(new Command(command, helpText));
};




// GROUP: Help
rsc('lalib?',
    async()=>{
        const converter = reloadMarkdownProcessor();
        const readme = await (await fetch('/scripts/extensions/third-party/SillyTavern-LALib/README.md')).text();
        sendSystemMessage('generic', converter.makeHtml(readme));
    },
    [],
    ' – Lists LALib commands',
);


// GROUP: Boolean Operations
rsc('test',
    (args)=>{
        const { a, b, rule } = parseBooleanOperands(args);
        return JSON.stringify(evalBoolean(rule, a, b));
    },
    [],
    '<span class="monospace">left=val rule=rule right=val</span> – Returns true or false, depending on whether left and right adhere to rule. Available rules: gt => a > b, gte => a >= b, lt => a < b, lte => a <= b, eq => a == b, neq => a != b, not => !a, in (strings) => a includes b, nin (strings) => a not includes b',
    true,
    true,
);

rsc('and',
    (args)=>{
        let left = args.left;
        try { left = JSON.parse(args.left); } catch { /* empty */ }
        let right = args.right;
        try { right = JSON.parse(args.right); } catch { /* empty */ }
        return JSON.stringify((left && right) == true);
    },
    [],
    '<span class="monospace">left=val right=val</span> – Returns true if both left and right are true, otherwise false.',
    true,
    true,
);

rsc('or',
    (args)=>{
        let left = args.left;
        try { left = JSON.parse(args.left); } catch { /* empty */ }
        let right = args.right;
        try { right = JSON.parse(args.right); } catch { /* empty */ }
        return JSON.stringify((left || right) == true);
    },
    [],
    '<span class="monospace">left=val right=val</span> – Returns true if at least one of left and right are true, false if both are false.',
    true,
    true,
);

rsc('not',
    (args, value)=>{
        return JSON.stringify(isTrueBoolean(value) != true);
    },
    [],
    '<span class="monospace">(value)</span> – Returns true if value is false, otherwise true.',
    true,
    true,
);


// GROUP: List Operations
rsc('foreach',
    async(args, value)=>{
        let list = getListVar(args.var, args.globalvar, args.list);
        let result;
        const isList = Array.isArray(list);
        if (isList) {
            list = list.map((it,idx)=>[idx,it]);
        } else if (typeof list == 'object') {
            list = Object.entries(list);
        }
        if (Array.isArray(list)) {
            for (let [index,item] of list) {
                if (typeof item == 'object') {
                    item = JSON.stringify(item);
                }
                result = (await executeSlashCommands(value.replace(/{{item}}/ig, item).replace(/{{index}}/ig, index)))?.pipe;
            }
            return result;
        }

        if (typeof result == 'object') {
            result = JSON.stringify(result);
        }
        return result;
    },
    [],
    '<span class="monospace">[optional list=[1,2,3]] [optional var=varname] [optional globalvar=globalvarname] (/command {{item}} {{index}})</span> – Executes command for each item of a list or dictionary.',
    true,
    true,
);

rsc('map',
    async(args, value)=>{
        let list = getListVar(args.var, args.globalvar, args.list);
        let result;
        const isList = Array.isArray(list);
        if (isList) {
            list = list.map((it,idx)=>[idx,it]);
            result = [];
        } else if (typeof list == 'object') {
            list = Object.entries(list);
            result = {};
        }
        if (Array.isArray(list)) {
            for (let [index,item] of list) {
                if (typeof item == 'object') {
                    item = JSON.stringify(item);
                }
                result[index] = (await executeSlashCommands(value.replace(/{{item}}/ig, item).replace(/{{index}}/ig, index)))?.pipe;
                try { result[index] = JSON.parse(result[index]); } catch { /* empty */ }
            }
        } else {
            result = list;
        }

        if (typeof result == 'object') {
            result = JSON.stringify(result);
        }
        return result;
    },
    [],
    '<span class="monospace">[optional list=[1,2,3]] [optional var=varname] [optional globalvar=globalvarname] (/command {{item}} {{index}})</span> – Executes command for each item of a list or dictionary and returns the list or dictionary of the command results.',
);

rsc('filter',
    async(args, value)=>{
        let list = getListVar(args.var, args.globalvar, args.list);
        let result;
        const isList = Array.isArray(list);
        if (isList) {
            list = list.map((it,idx)=>[idx,it]);
            result = [];
        } else if (typeof list == 'object') {
            list = Object.entries(list);
            result = {};
        }
        if (Array.isArray(list)) {
            for (let [index,item] of list) {
                if (typeof item == 'object') {
                    item = JSON.stringify(item);
                }
                if (isTrueBoolean((await executeSlashCommands(value.replace(/{{item}}/ig, item).replace(/{{index}}/ig, index)))?.pipe)) {
                    if (isList) {
                        result.push(item);
                    } else {
                        result[index] = item;
                    }
                }
            }
        } else {
            result = list;
        }

        if (typeof result == 'object') {
            result = JSON.stringify(result);
        }
        return result;
    },
    [],
    '<span class="monospace">[optional list=[1,2,3]] [optional var=varname] [optional globalvar=globalvarname] (/command {{item}} {{index}})</span> – Executes command for each item of a list or dictionary and returns the list or dictionary of only those items where the command returned true.',
);

rsc('find',
    async(args, value)=>{
        let list = getListVar(args.var, args.globalvar, args.list);
        let result;
        const isList = Array.isArray(list);
        if (isList) {
            list = list.map((it,idx)=>[idx,it]);
            result = [];
        } else if (typeof list == 'object') {
            list = Object.entries(list);
            result = {};
        }
        if (Array.isArray(list)) {
            for (let [index,item] of list) {
                if (typeof item == 'object') {
                    item = JSON.stringify(item);
                }
                if (isTrueBoolean((await executeSlashCommands(value.replace(/{{item}}/ig, item).replace(/{{index}}/ig, index)))?.pipe)) {
                    if (typeof result == 'object') {
                        return JSON.stringify(item);
                    }
                    return item;
                }
            }
            return undefined;
        }
        return undefined;
    },
    [],
    '<span class="monospace">[optional list=[1,2,3]] [optional var=varname] [optional globalvar=globalvarname] (/command {{item}} {{index}})</span> – Executes command for each item of a list or dictionary and returns the first item where the command returned true.',
);

rsc('slice',
    (args, value)=>{
        const list = getListVar(args.var, args.globalvar, value) ?? getVar(args.var, args.globalvar, value);
        let end = args.end ?? (args.length ? Number(args.start) + Number(args.length) : undefined);
        const result = list.slice(args.start, end);
        if (typeof result == 'object') {
            return JSON.stringify(result);
        }
        return result;
    },
    [],
    '<span class="monospace">start=int [optional end=int] [optional length=int] [optional var=varname] [optional globalvar=globalvarname] (optional value)</span> – Retrieves a slice of a list or string.',
);

rsc('shuffle',
    (args, value)=>{
        const list = getListVar(null, null, value);
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        return JSON.stringify(list);
    },
    [],
    '<span class="monospace">(list to shuffle)</span> – Returns a shuffled list.',
);

rsc('dict',
    (args, value)=>{
        const result = {};
        const list = getListVar(args.var, args.globalvar, value);
        for (const [key, val] of list) {
            result[key] = val;
        }
        return JSON.stringify(result);
    },
    [],
    '<span class="monospace">[optional var=varname] [optional globalvar=globalvarname] (list of lists)</span> – Takes a list of lists (each item must be a list of at least two items) and creates a dictionary by using each items first item as key and each items second item as value.',
);


// GROUP: Split & Join
rsc('split',
    (args, value)=>{
        value = getListVar(args.var, args.globalvar, value) ?? getVar(args.var, args.globalvar, value);
        let find = args.find ?? ',';
        if (find.match(/^\/.+\/[a-z]*$/)) {
            find = new RegExp(find.replace(/^\/(.+)\/([a-z]*)$/, '$1'), find.replace(/^\/(.+)\/([a-z]*)$/, '$2'));
        }
        return JSON.stringify(value.split(find).map(it=>isTrueBoolean(args.trim ?? 'true') ? it.trim() : it));
    },
    [],
    '<span class="monospace">[optional find=","] [optional trim=true|false] [optional var=varname] [optional globalvar=globalvarname] (value)</span> – Splits value into list at every occurrence of find. Supports regex <code>find=/\\s/</code>',
    true,
    true,
);

rsc('join',
    (args, value)=>{
        let list = getListVar(args.var, args.globalvar, value);
        if (Array.isArray(list)) {
            const glue = (args.glue ?? ', ')
                .replace(/{{space}}/g, ' ')
            ;
            return list.join(glue);
        }
    },
    [],
    '<span class="monospace">[optional glue=", "] [optional var=varname] [optional globalvar=globalvarname] (optional list)</span> – Joins the items of a list with glue into a single string. Use <code>glue={{space}}</code> to join with a space.',
    true,
    true,
);


// GROUP: Text Operations
rsc('trim',
    (args, value)=>{
        return value?.trim();
    },
    [],
    '<span class="monospace">(text to trim)</span> – Removes whitespace at the start and end of the text.',
);

rsc('replace',
    (args, value) => {
        let find = args.find;
        const replace = args.replace;
        const target = getVar(args.var, args.globalvar, value);

        if (find.match(/^\/.+\/[a-z]*$/)) {
            find = new RegExp(find.replace(/^\/(.+)\/([a-z]*)$/, '$1'), find.replace(/^\/(.+)\/([a-z]*)$/, '$2'));
        }
        return target.replace(find, replace); 
    },
    [],
    '<span class="monospace">[find=string_or_regex] [replace=string] [optional var=varname] [optional globalvar=globalvarname] (optional value)</span> – Replaces the first occurrence of "find" with "replace" in the given value or variable.',
);

rsc('replaceAll',
    (args, value) => {
        let find = args.find;
        const replace = args.replace;
        const target = getVar(args.var, args.globalvar, value);

        if (find.match(/^\/.+\/[a-z]*$/)) {
            find = new RegExp(find.replace(/^\/(.+)\/([a-z]*)$/, '$1'), find.replace(/^\/(.+)\/([a-z]*)$/, '$2'));
        } else {
            find = new RegExp(find, 'g');
        }
        return target.replace(find, replace); 
    },
    [],
    '<span class="monospace">[find=string_or_regex] [replace=string] [optional var=varname] [optional globalvar=globalvarname] (optional value)</span> – Replaces all occurrences of "find" with "replace" in the given value or variable.',
);

rsc('diff',
    async (args, value)=>{
        /**@type {HTMLScriptElement} */
        let script = document.querySelector('script[src*="SillyTavern-LALib/lib/wiked-diff.js"]');
        if (!script) {
            await new Promise(resolve=>{
                script = document.createElement('script');
                script.addEventListener('load', resolve);
                script.src = '/scripts/extensions/third-party/SillyTavern-LALib/lib/wiked-diff.js';
                document.body.append(script);
            });
            const style = document.createElement('style');
            style.innerHTML = `
                html > body {
                    #dialogue_popup.wide_dialogue_popup.large_dialogue_popup:has(.lalib--diffContainer) {
                        aspect-ratio: unset;
                    }
                    .lalib--diffWrapper {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        overflow: hidden;
                        align-items: stretch;
                        gap: 1em;
                        > .lalib--diffNotes {
                            flex: 0 0 auto;
                            align-self: center;
                            max-height: 20vh;
                            overflow: auto;
                            text-align: left;
                            font-size: 88%;
                            white-space: pre-wrap;
                        }
                        .lalib--diffContainer {
                            display: flex;
                            flex-direction: row;
                            gap: 1em;
                            text-align: left;
                            overflow: hidden;
                            flex: 1 1 auto;
                            > .lalib--diffOld, > .lalib--diffNew {
                                font-size: 88%;
                                line-height: 1.6;
                                white-space: pre-wrap;
                            }
                            > .lalib--diffOld, > .lalib--diffNew, .lalib--diffDiff {
                                flex: 1 1 0;
                                overflow: auto;
                                background-color: var(--greyCAIbg);
                            }
                        }
                        .lalib--diffButtons {
                            display: flex;
                            flex-direction: row;
                            gap: 1em;
                            justify-content: center;
                            > .lalib--diffButton {
                                white-space: nowrap;
                            }
                        }
                    }
                    .wikEdDiffFragment {
                        background-color: transparent;
                        border: none;
                        box-shadow: none;
                        padding: 0;
                        text-align: left;
                        * {
                            text-shadow: none !important;
                        }
                        .wikEdDiffInsert {
                            font-weight: normal;
                            background-color: rgb(200, 255, 200);
                        }
                        .wikEdDiffDelete {
                            font-weight: normal;
                            background-color: rgb(255, 150, 150);
                            text-decoration: line-through;
                        }
                        .wikEdDiffBlock {
                            font-weight: normal;
                            color: rgb(0, 0, 0);
                        }
                    }
                }
            `;
            document.body.append(style);
        }
        const makeDiffer = ()=>{
            const differ = new WikEdDiff();
            window.wikEdDiffConfig = window.wikEdDiffConfig ?? {};
            differ.config.fullDiff = true;
            differ.config.charDiff = false;
            // differ.config.unlinkMax = 50;
            return differ;
        };
        let oldText = args.old;
        let newText = args.new;
        if (isTrueBoolean(args.stripcode)) {
            const stripcode = (text)=>text.split('```').filter((_,idx)=>idx % 2 == 0).join('');
            oldText = stripcode(oldText);
            newText = stripcode(newText);
        }
        const differ = makeDiffer();
        const diffHtml = differ.diff(oldText, newText);
        let diff;
        const updateDebounced = debounce((newText)=>diff.innerHTML = makeDiffer().diff(oldText, newText));
        const dom = document.createElement('div'); {
            dom.classList.add('lalib--diffWrapper');
            if (args.notes && args.notes.length) {
                const notes = document.createElement('div'); {
                    notes.classList.add('lalib--diffNotes');
                    notes.textContent = args.notes;
                    dom.append(notes);
                }
            }
            const container = document.createElement('div'); {
                container.classList.add('lalib--diffContainer');
                if (isTrueBoolean(args.all)) {
                    const old = document.createElement('div'); {
                        old.classList.add('lalib--diffOld');
                        old.textContent = oldText;
                        container.append(old);
                    }
                    const ne = document.createElement('textarea'); {
                        ne.classList.add('lalib--diffNew');
                        ne.value = newText;
                        ne.addEventListener('input', ()=>{
                            newText = ne.value;
                            updateDebounced(ne.value);
                        });
                        container.append(ne);
                    }
                }
                diff = document.createElement('div'); {
                    diff.classList.add('lalib--diffDiff');
                    diff.innerHTML = diffHtml;
                    container.append(diff);
                }
                dom.append(container);
            }
            if (isTrueBoolean(args.buttons)) {
                const buttons = document.createElement('div'); {
                    buttons.classList.add('lalib--diffButtons');
                    const btnOld = document.createElement('div'); {
                        btnOld.classList.add('lalib--diffButton');
                        btnOld.classList.add('menu_button');
                        btnOld.textContent = 'Use Old Text';
                        btnOld.addEventListener('click', ()=>{
                            result = oldText;
                            document.querySelector('#dialogue_popup_ok').click();
                        });
                        buttons.append(btnOld);
                    }
                    const btnNew = document.createElement('div'); {
                        btnNew.classList.add('lalib--diffButton');
                        btnNew.classList.add('menu_button');
                        btnNew.textContent = 'Use New Text';
                        btnNew.addEventListener('click', ()=>{
                            result = newText;
                            document.querySelector('#dialogue_popup_ok').click();
                        });
                        buttons.append(btnNew);
                    }
                    dom.append(buttons);
                }
            }
        }
        let result = '';
        await callPopup(dom, 'text', null, { wide:true, large:true, okButton:'Close' });
        return result;
    },
    [],
    '<span class="monospace">[optional all=true] [optional buttons=true] [optional stripcode=true] [optional notes=text] [old=oldText] [new=newText]</span> – Compares old text vs new text and displays the difference between the two. Use <code>all=true</code> to show new, old, and diff side by side. Use <code>buttons=true</code> to add buttons to pick which text to return. Use <code>stripcode=true</code> to remove all codeblocks before diffing. Use <code>notes="some text"</code> to show additional notes or comments above the comparison.',
);

rsc('json-pretty',
    (args, value)=>{
        return JSON.stringify(JSON.parse(value), null, 4);
    },
    [],
    '<span class="monospace">(JSON)</span> – Pretty print JSON.',
);


// GROUP: Accessing & Manipulating Structured Data
rsc('getat',
    (args, value)=>{
        let index = getListVar(null, null, args.index) ?? [args.index];
        if (!Array.isArray(index)) {
            index = [index];
        }
        const list = getListVar(args.var, args.globalvar, value);
        let result = list;
        while (index.length > 0 && result !== undefined) {
            const ci = index.shift();
            result = Array.isArray(result) ? result.slice(ci)[0] : result[ci];
            try { result = JSON.parse(result); } catch { /* empty */ }
        }
        if (typeof result == 'object') {
            return JSON.stringify(result);
        }
        return result;
    },
    [],
    '<span class="monospace">index=int|fieldname|list [optional var=varname] [optional globalvar=globalvarname] (optional value)</span> – Retrieves an item from a list or a property from a dictionary.',
);

rsc('setat',
    async(args, value)=>{
        try { value = JSON.parse(value); } catch { /* empty */ }
        let index = getListVar(null, null, args.index) ?? [args.index];
        const list = getListVar(args.var, args.globalvar, args.value) ?? (Number.isNaN(Number(index[0])) ? {} : []);
        if (!Array.isArray(index)) {
            index = [index];
        }
        let current = list;
        while (index.length > 0) {
            const ci = index.shift();
            if (index.length > 0 && current[ci] === undefined) {
                if (Number.isNaN(Number(index[0]))) {
                    current[ci] = {};
                } else {
                    current[ci] = [];
                }
            }
            if (index.length == 0) {
                current[ci] = value;
            }
            const prev = current;
            current = current[ci];
            try {
                current = JSON.parse(current);
                prev[ci] = current;
            } catch { /* empty */ }
        }
        if (list !== undefined) {
            let result = (typeof list == 'object') ? JSON.stringify(list) : list;
            if (args.var) {
                await executeSlashCommands(`/setvar key="${args.var}" ${result.replace(/\|/g, '\\|')}`);
            }
            if (args.globalvar) {
                await executeSlashCommands(`/setglobalvar key="${args.globalvar}" ${result.replace(/\|/g, '\\|')}`);
            }
            return result;
        }
    },
    [],
    '<span class="monospace">index=int|fieldname|list [optional var=varname] [optional globalvar=globalvarname] [optional value=list|dictionary] (value)</span> – Sets an item in a list or a property in a dictionary. Example: <code>/setat value=[1,2,3] index=1 X</code> returns <code>[1,"X",3]</code>, <code>/setat var=myVariable index=[1,2,"somePropery"] foobar</code> sets the value of <code>myVariable[1][2].someProperty</code> to "foobar" (the variable will be updated and the resulting value of myVariable will be returned). Can be used to create structures that do not already exist.',
);


// GROUP: Exception Handling
rsc('try',
    async(args, value)=>{
        try {
            const result = await executeSlashCommands(value);
            return JSON.stringify({
                isException: false,
                result: result.pipe,
            });
        } catch (ex) {
            return JSON.stringify({
                isException: true,
                exception: ex?.message ?? ex,
            });
        }
    },
    [],
    '<span class="monospace">(command)</span> – try catch.',
);

rsc('catch',
    async(args, value)=>{
        if (args.pipe) {
            let data;
            try {
                data = JSON.parse(args.pipe);
            } catch (ex) {
                console.warn('[LALIB]', '[CATCH]', 'failed to parse args.pipe', args.pipe, ex);
            }
            if (data?.isException) {
                const result = await executeSlashCommands(value.replace(/{{(exception|error)}}/ig, data.exception));
                return result.pipe;
            } else {
                return data?.result;
            }
        }
    },
    [],
    '<span class="monospace">[pipe={{pipe}}] (command)</span> – try catch. You must always set <code>pipe={{pipe}}</code> and /catch must always be called right after /try. Use <code>{{exception}}</code> or <code>{{error}}</code> to get the exception\'s message.',
);


// GROUP: Copy & Download
rsc('copy',
    (args, value)=>{
        const ta = document.createElement('textarea'); {
            ta.value = value;
            ta.style.position = 'fixed';
            ta.style.inset = '0';
            document.body.append(ta);
            ta.focus();
            ta.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Unable to copy to clipboard', err);
            }
            ta.remove();
        }
    },
    [],
    '<span class="monospace">(value)</span> – Copies value into clipboard.',
    true,
    true,
);

rsc('download',
    (args, value)=>{
        const blob = new Blob([value], { type:'text' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); {
            a.href = url;
            const name = args.name ?? `SillyTavern-${new Date().toISOString()}`;
            const ext = args.ext ?? 'txt';
            a.download = `${name}.${ext}`;
            a.click();
        }
    },
    [],
    '<span class="monospace">[optional name=filename] [optional ext=extension] (value)</span> – Downloads value as a text file.',
    true,
    true,
);


// GROUP: DOM Interaction
rsc('dom',
    (args, query)=>{
        /**@type {HTMLElement} */
        let target;
        try {
            target = document.querySelector(query);
        } catch (ex) {
            toastr.error(ex?.message ?? ex);
        }
        if (!target) {
            toastr.warning(`No element found for query: ${query}`);
            return;
        }
        switch (args.action) {
            case 'click': {
                target.click();
                break;
            }
            case 'value': {
                if (target.value === undefined) {
                    toastr.warning(`Cannot set value on ${target.tagName}`);
                    return;
                }
                target.value = args.value;
                target.dispatchEvent(new Event('change', { bubbles:true }));
                return;
            }
            case 'property': {
                if (target[args.property] === undefined) {
                    toastr.warning(`Property does not exist: ${target.tagName}`);
                    return;
                }
                return target[args.property];
            }
            case 'attribute': {
                return target.getAttribute(args.attribute);
            }
        }
    },
    [],
    '<span class="monospace">[action=click|value|property] [optional value=newValue] [optional property=propertyName] [optional attribute=attributeName] (CSS selector)</span> – Click on an element, change its value, retrieve a property, or retrieve an attribute. To select the targeted element, use CSS selectors. Example: <code>/dom action=click #expandMessageActions</code> or <code>/dom action=value value=0 #avatar_style</code>',
);


// GROUP: Group Chats
rsc('memberpos',
    async(args, value)=>{
        if (!selected_group) {
            toastr.warning('Cannot run /memberpos command outside of a group chat.');
            return '';
        }
        const group = groups.find(it=>it.id == selected_group);
        const name = value.replace(/^(.+?)(\s+(\d+))?$/, '$1');
        const char = characters[findGroupMemberId(name)];
        let index = value.replace(/^(.+?)(\s+(\d+))?$/, '$2');
        let currentIndex = group.members.findIndex(it=>it == char.avatar);
        if (index === null) {
            return currentIndex;
        }
        index = Math.min(group.members.length - 1, parseInt(index));
        while (currentIndex < index) {
            await executeSlashCommands(`/memberdown ${name}`);
            currentIndex++;
        }
        while (currentIndex > index) {
            await executeSlashCommands(`/memberup ${name}`);
            currentIndex--;
        }
        return currentIndex;
    },
    [],
    '<span class="monospace">(name) (position)</span> – Move group member to position (index starts with 0).</code>',
);


// GROUP: Conditionals - switch
rsc('switch',
    (args, value)=>{
        const val = getVar(args.var, args.globalvar, value);
        return JSON.stringify({
            switch: val,
        });
    },
    [],
    '<span class="monospace">[optional var=varname] [optional globalvar=globalvarname] (optional value)</span> – Use with /case.',
);

rsc('case',
    async (args, value)=>{
        if (args.pipe) {
            let data;
            try {
                data = JSON.parse(args.pipe);
            } catch (ex) {
                console.warn('[LALIB]', '[CASE]', 'failed to parse args.pipe', args.value, ex);
            }
            if (data?.switch !== undefined) {
                if (data.switch == args.value) {
                    return (await executeSlashCommands(value.replace(/{{value}}/ig, data.switch)))?.pipe;
                }
            }
            return args.pipe;
        }
    },
    [],
    '<span class="monospace">[pipe={{pipe}}] [value=comparisonValue] (/command)</span> – Execute command and break out of the switch if the value given in /switch matches the value given here.',
);


// GROUP: Conditionals - if
rsc('ife',
    async(args, value)=>{
        const result = await executeSlashCommands(value);
        return JSON.stringify({
            if: isTrueBoolean(result?.pipe),
        });
    },
    [],
    '<span class="monospace">(/command)</span> – Use with /then, /elseif, and /else. The provided command must return true or false.',
);

rsc('elseif',
    async(args, value)=>{
        if (args.pipe) {
            let data;
            try {
                data = JSON.parse(args.pipe);
            } catch (ex) {
                console.warn('[LALIB]', '[ELSEIF]', 'failed to parse args.pipe', args.value, ex);
            }
            if (data?.if !== undefined) {
                if (!data.if) {
                    const result = await executeSlashCommands(value);
                    return JSON.stringify({
                        if: isTrueBoolean(result?.pipe),
                    });
                }
            }
        }
        return args.pipe;
    },
    [],
    '<span class="monospace">[pipe={{pipe}}] (/command)</span> – Use with /ife, /then, and /else. The provided command must return true or false.',
);

rsc('else',
    async(args, value)=>{
        if (args.pipe) {
            let data;
            try {
                data = JSON.parse(args.pipe);
            } catch (ex) {
                console.warn('[LALIB]', '[ELSE]', 'failed to parse args.pipe', args.value, ex);
            }
            if (data?.if !== undefined) {
                if (!data.if) {
                    const result = await executeSlashCommands(value);
                    return result.pipe;
                }
            }
        }
        return args.pipe;
    },
    [],
    '<span class="monospace">[pipe={{pipe}}] (/command)</span> – Use with /ife, /elseif, and /then. The provided command will be executed if the previous /if or /elseif was false.',
);

rsc('then',
    async(args, value)=>{
        if (args.pipe) {
            let data;
            try {
                data = JSON.parse(args.pipe);
            } catch (ex) {
                console.warn('[LALIB]', '[THEN]', 'failed to parse args.pipe', args.value, ex);
            }
            if (data?.if !== undefined) {
                if (data.if) {
                    const result = await executeSlashCommands(value);
                    return result.pipe;
                }
            }
        }
        return args.pipe;
    },
    [],
    '<span class="monospace">[pipe={{pipe}}] (/command)</span> – Use with /ife, /elseif, and /else. The provided command will be executed if the previous /if or /elseif was true.',
);


const getBookNamesWithSource = ()=>{
    const context = getContext();
    return {
        global: world_info.globalSelect ?? [],
        chat: chat_metadata.world_info ?? null,
        character: characters[context.characterId]?.data?.character_book?.name ?? null,
        characterAuxiliary: world_info.charLore?.find(it=>it.name == characters[context.characterId]?.avatar?.split('.')?.slice(0,-1)?.join('.'))?.map(it=>it.extraBooks) ?? [],
        group: groups
            .find(it=>it.id == context.groupId)
            ?.members
            ?.map(m=>[m, characters.find(it=>it.avatar == m)?.data?.character_book?.name])
            ?.reduce((dict,cur)=>{
                dict[cur[0]] = {
                    character: cur[1] ?? null,
                    auxiliary: world_info.charLore?.find(it=>it.name == cur[0].split('.').slice(0,-1).join('.'))?.extraBooks ?? [],
                };
                return dict;
            }, {})
            ?? {},
    };
};
const getBookNames = ()=>{
    const context = getContext();
    const names = [
        ...(world_info.globalSelect ?? []),
        chat_metadata.world_info,
        characters[context.characterId]?.data?.character_book?.name,
        ...world_info.charLore?.find(it=>it.name == characters[context.characterId]?.avatar?.split('.')?.slice(0,-1)?.join('.'))?.map(it=>it.extraBooks) ?? [],
        ...(groups
            .find(it=>it.id == context.groupId)
            ?.members
            ?.map(m=>[
                ...(characters.find(it=>it.avatar == m)?.data?.character_book?.name ?? []),
                ...(world_info.charLore?.find(it=>it.name == m.split('.').slice(0,-1).join('.'))?.extraBooks ?? []),
            ])
                ?? []
        ),
    ].filter(it=>it);
    return names;
};
// GROUP: World Info
rsc('wi-list-books',
    async(args, value)=>{
        if (isTrueBoolean(args.source)) {
            return JSON.stringify(getBookNamesWithSource());
        }
        return JSON.stringify(getBookNames());
    },
    [],
    '<span class="monospace">[optional source=true]</span> – Get a list of currently active World Info books. Use <code>source=true</code> to get a dictionary of lists where the keys are the activation sources.',
);

rsc('wi-list-entries',
    async(args, value)=>{
        const loadBook = async(name)=>{
            const result = await fetch('/api/worldinfo/get', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({ name }),
            });
            if (result.ok) {
                const data = await result.json();
                data.entries = Object.keys(data.entries).map(it=>{
                    data.entries[it].book = name;
                    return data.entries[it];
                });
                data.book = name;
                return data;
            } else {
                toastr.warning(`Failed to load World Info book: ${name}`);
            }
        };
        let names;
        let isNameGiven = false;
        if (value && value?.trim()?.length && value != '""' && value != 'null') {
            names = [value.trim()];
            isNameGiven = true;
        } else {
            names = getBookNames();
        }
        const books = {};
        for (const book of names) {
            books[book] = await loadBook(book);
        }
        if (isTrueBoolean(args.flat) || isNameGiven) {
            return JSON.stringify(Object.keys(books).map(it=>books[it].entries).flat());
        }
        return JSON.stringify(books);
    },
    [],
    '<span class="monospace">[optional flat=true] (optional book name)</span> – Get a list of World Info entries from currently active books or from the book with the provided name. Use <code>flat=true</code> to list all entries in a flat list instead of a dictionary with entries per book.',
);


// GROUP: Costumes / Sprites
rsc('costumes',
    async(args, value)=>{
        const response = await fetch('/api/plugins/costumes/', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ folder:value, recurse:args.recurse ?? true }),
        });
        if (!response.ok) {
            toastr.error(`Failed to retrieve costumes: ${response.status} - ${response.statusText}`);
            return '[]';
        }
        return await response.text();
    },
    [],
    '<span class="monospace">[optional recurse=false] (folder)</span> – Get a list of costume / sprite folders, recursive by default.',
);


// GROUP: Quick Replies
rsc('qr-edit',
    async(args, value)=>{
        let set = args.set;
        let label = args.label ?? value;
        if (set === undefined) {
            const sets = [...quickReplyApi.listGlobalSets(), ...quickReplyApi.listChatSets()];
            for (const setName of sets) {
                if (quickReplyApi.listQuickReplies(setName).includes(label)) {
                    set = setName;
                    break;
                }
            }
        }
        quickReplyApi.getQrByLabel(set, label)?.showEditor();
    },
    [],
    '<span class="monospace">[optional set=qrSetName] [optional label=qrLabel] (optional qrLabel)</span> – Show the Quick Reply editor. If no QR set is provided, tries to find a QR in one of the active sets.',
);

rsc('qr-add',
    async(args, value)=>{
        let set = args.set ?? quickReplyApi.listGlobalSets()[0] ?? quickReplyApi.listChatSets()[0];
        if (set === undefined) {
            toastr.error('No Quick Reply Set given and no active Quick Reply Sets to add the new Quick Reply to.');
            return;
        }
        let label = args.label ?? value;
        quickReplyApi.createQuickReply(set, label)?.showEditor();
    },
    [],
    '<span class="monospace">[optional set=qrSetName] [optional label=qrLabel] (optional qrLabel)</span> – Create a new Quick Reply and open its editor. If no QR set is provided, tries to find a QR in one of the active sets.',
);


// GROUP: Chat Messages
rsc('swipes-get',
    (args, value)=>{
        const idx = args.message && !isNaN(Number(args.message)) ? Number(args.message) : chat.length - 1;
        return chat[idx]?.swipes?.[Number(value)] ?? '';
    },
    ['getswipe'],
    '<span class="monospace">[optional message=messageId] (index)</span> – Get the n-th swipe (zero-based index) from the last message or the message with the given message ID.',
);

rsc('swipes-list',
    (args, value)=>{
        const idx = args.message && !isNaN(Number(args.message)) ? Number(args.message) : chat.length - 1;
        return JSON.stringify(chat[idx]?.swipes ?? []);
    },
    [],
    '<span class="monospace">[optional message=messageId]</span> – Get a list of all swipes from the last message or the message with the given message ID.',
);

rsc('swipes-count',
    (args, value)=>{
        const idx = args.message && !isNaN(Number(args.message)) ? Number(args.message) : chat.length - 1;
        return chat[idx]?.swipes?.length ?? 0;
    },
    [],
    '<span class="monospace">[optional message=messageId]</span> – Get the number of all swipes from the last message or the message with the given message ID.',
);

rsc('swipes-index',
    (args, value)=>{
        const idx = args.message && !isNaN(Number(args.message)) ? Number(args.message) : chat.length - 1;
        return chat[idx]?.swipe_id ?? 0;
    },
    [],
    '<span class="monospace">[optional message=messageId]</span> – Get the current swipe index from the last message or the message with the given message ID.',
);

rsc('swipes-add',
    (args, value)=>{
        const id = chat.length - 1;
        const mes = chat[id];
        const currentMessage = document.querySelector(`#chat [mesid="${id}"]`);

        // close current message editor
        document.querySelector('#curEditTextarea')?.closest('.mes')?.querySelector('.mes_edit_cancel')?.click();

        if (mes.swipe_id === undefined) {
            mes.swipe_id = 0;
        }
        if (mes.swipes === undefined) {
            mes.swipes = [mes.mes];
        }
        if (mes.swipes_info === undefined) {
            mes.swipe_info = [{
                send_date: mes.send_date,
                gen_started: mes.gen_started,
                gen_finished: mes.gen_finished,
                extra: JSON.parse(JSON.stringify(mes.extra)),
            }];
        }
        mes.swipe_id = mes.swipes.length - 1;
        mes.swipes.push(value);
        mes.swipe_info.push({send_date:getMessageTimeStamp(), extra:{}});
        currentMessage.querySelector('.swipe_right').click();
    },
    [],
    '<span class="monospace">(message)</span> – Add a new swipe to the last message.',
);

rsc('swipes-del',
    async(args, value)=>{
        const id = chat.length - 1;
        const mes = chat[id];
        const currentMessage = document.querySelector(`#chat [mesid="${id}"]`);

        // close current message editor
        document.querySelector('#curEditTextarea')?.closest('.mes')?.querySelector('.mes_edit_cancel')?.click();

        if (mes.swipe_id === undefined || (mes.swipes?.length ?? 0) < 2) {
            return;
        }
        const swipeId = Number(value == '' ? mes.swipe_id : value);
        mes.swipe_id = mes.swipes.length - 2;
        mes.swipes.push('deleting swipe...');
        mes.swipe_info.push({ send_date:getMessageTimeStamp(), extra:{} });
        mes.swipes.splice(swipeId, 1);
        mes.swipe_info.splice(swipeId, 1);
        currentMessage.querySelector('.swipe_right').click();
        mes.swipes.pop();
        mes.swipe_info.pop();
        mes.swipe_id = swipeId % mes.swipes.length;
        currentMessage.querySelector('.swipe_left').click();
    },
    [],
    '<span class="monospace">(optional index)</span> – Delete the current swipe or the swipe at index (0-based).',
);

rsc('swipes-go',
    (args, value)=>{
        const id = chat.length - 1;
        const mes = chat[id];
        const currentMessage = document.querySelector(`#chat [mesid="${id}"]`);
        if (mes.swipe_id === undefined || (mes.swipes?.length ?? 0) < 2) {
            return;
        }
        const swipeId = Number(value);
        mes.swipe_id = (swipeId + 1) % mes.swipes.length;
        currentMessage.querySelector('.swipe_left').click();
    },
    [],
    '<span class="monospace">(index)</span> – Go to the swipe. 0-based index.',
);

rsc('swipes-swipe',
    async(args, value)=>{
        const id = chat.length - 1;
        const currentMessage = document.querySelector(`#chat [mesid="${id}"]`);
        await executeSlashCommands('/swipes-count | /sub {{pipe}} 1 | /swipes-go');
        currentMessage.querySelector('.swipe_right').click();
        await new Promise(resolve=>eventSource.once(event_types.GENERATION_ENDED, resolve));
        await delay(200);
        return chat[id].mes;
    },
    [],
    '<span class="monospace"></span> – Trigger a new swipe on the current message.',
);

rsc('message-edit',
    (args, value)=>{
        /**@type {HTMLTextAreaElement} */
        const input = document.querySelector('#send_textarea');
        const restoreFocus = document.activeElement == input;
        value = value.replace(/{{space}}/g, ' ');
        document.querySelector(`#chat [mesid="${args.message ?? chat.length - 1}"] .mes_edit`).click();
        if (isTrueBoolean(args.append)) {
            document.querySelector('#curEditTextarea').value += value;
        } else {
            document.querySelector('#curEditTextarea').value = value;
        }
        document.querySelector(`#chat [mesid="${args.message ?? chat.length - 1}"] .mes_edit_done`).click();
        if (restoreFocus) input.focus();
    },
    [],
    '<span class="monospace">[optional message=messageId] [optional append=true] (new text)</span> – Edit the current message or the message at the provided message ID. Use <code>append=true</code> to add the provided text at the end of the message. Use <code>{{space}}</code> to add space at the beginning of the text.',
);


// GROUP: Time & Date
rsc('timestamp',
    (args, value) => {
        return JSON.stringify(new Date().getTime());
    },
    [],
    '<span class="monospace"></span> – Returns the number of milliseconds midnight at the beginning of January 1, 1970, UTC.',
);


// GROUP: Async
rsc('fireandforget',
    (args, value)=>{
        executeSlashCommands(value);
    },
    [],
    '<span class="monospace">(command)</span> – Execute a command without waiting for it to finish.',
);


// GROUP: Undocumented
rsc('fetch',
    async(args, value)=>{
        if (!window.stfetch) {
            toastr.error('Userscript missing: SillyTavern - Fetch');
            throw new Error('Userscript missing: SillyTavern - Fetch');
        }
        try {
            const response = await window.stfetch({ url:value });
            return response.responseText;
        }
        catch (ex) {
            console.warn('[LALIB]', '[FETCH]', ex);
        }
    },
    [],
    '<span class="monospace">(url)</span> – UNDOCUMENTED',
);

rsc('$',
    (args, value)=>{
        const dom = document.createRange().createContextualFragment(value);
        let el;
        if (args.query) {
            el = dom.querySelector(args.query);
        } else if (dom.children.length == 1) {
            el = dom.children[0];
        } else {
            el = document.createElement('div');
            el.append(...dom.children);
        }
        if (args.call) {
            el[args.call]();
            return [...dom.children].map(it=>it.outerHTML).join('\n');
        } else {
            const result = el?.[args.take ?? 'outerHTML'];
            if (typeof result == 'object') {
                return JSON.stringify(result);
            }
            return result;
        }
    },
    [],
    '<span class="monospace">[optional query=cssSelector] [optional take=property] [optional call=property] (html)</span> – UNDOCUMENTED',
);

rsc('$$',
    (args, value)=>{
        const dom = document.createRange().createContextualFragment(value);
        let els;
        if (args.query) {
            els = Array.from(dom.querySelectorAll(args.query));
        } else {
            els = Array.from(dom.children);
        }
        if (args.call) {
            els.forEach(el=>el[args.call]());
            return [...dom.children].map(it=>it.outerHTML).join('\n');
        } else {
            const result = els.map(el=>el?.[args.take ?? 'outerHTML']);
            if (typeof result == 'object') {
                return JSON.stringify(result);
            }
            return result;
        }
    },
    [],
    '<span class="monospace">[optional query=cssSelector] [optional take=property] [optional call=property] (html)</span> – UNDOCUMENTED',
);
