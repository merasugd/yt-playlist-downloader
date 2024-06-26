const tools = require('./tools')
const colors = require('colors')

const createFilledBar = (total, current, size = 40, emptyChar = '□', filledChar = '■') => {
    if (typeof total !== 'number' || total <= 0) throw new Error('Invalid total value.');
    if (typeof current !== 'number') throw new Error('Invalid current value.');
    if (typeof size !== 'number' || size <= 0) throw new Error('Invalid size value.');

    if (current > total) {
        const bar = filledChar.repeat(size + 2);
        return [bar];
    } else {
        const percentage = current / total;
        const progress = Math.round(size * percentage);
        const emptyProgress = size - progress;

        const progressText = filledChar.repeat(progress);
        const emptyProgressText = emptyChar.repeat(emptyProgress);

        return [progressText + emptyProgressText];
    }
}

const getTerminalSize = () => {
    return process.stdout && process.stdout.rows >= 16 && process.stdout.columns >= 50 ? { height: process.stdout.rows, length: process.stdout.columns } : false
}

const centerify = (text, only_width) => {
    const terminal = getTerminalSize()

    if(!terminal) return text

    const lines = text.split('\n');
    const centeredLines = lines.map(raw_line => {
        const line = colors.stripColors(raw_line)
        const totalPadding = terminal.length - line.length;

        if (totalPadding <= 0) {
            return line
        }

        const leftPadding = Math.floor(totalPadding / 2);
        return ' '.repeat(leftPadding) + raw_line
    });

    const totalVerticalPadding = terminal.height - lines.length;

    if (totalVerticalPadding <= 0) {
        return centeredLines.join('\n');
    }
    
    const topPadding = Math.floor(totalVerticalPadding / 2);
    const bottomPadding = totalVerticalPadding - topPadding;

    const centeredText = '\n'.repeat(topPadding) + centeredLines.join('\n') + '\n'.repeat(bottomPadding);

    return only_width ? centeredLines.join('\n') : centeredText
}

module.exports.log = (message, progress) => {
    console.clear();
    console.log(tools.config['centered_logging'] ? (progress ? message : centerify(message, true)) : message);
}

module.exports.progress = (current, total, label = '') => {
    current = Math.floor(current);

    const [bar] = createFilledBar(total, current);

    module.exports.log(`${bar} ${label} ${current}/${total}`);
}

module.exports.multipleProgress = (progressList = []) => {
    let terminal = getTerminalSize()

    let bars = progressList.map(v => {
        if(typeof v !== 'object') return v
        if(!v.total || !v.current || !v.label) return 'not-bar'

        let { total, current, label } = v
        let size = tools.config['centered_logging'] && terminal ? Math.floor((terminal.length) - (total === 100 ? Math.floor(2 + String(current).length) : Math.floor(2 + Math.floor(String(total).length + String(current).length)))) : 40

        const [bar] = createFilledBar(total, current, terminal.length >= 100 ? 100 : size);

        return tools.config['centered_logging'] && terminal ? (total === 100 ? `${bar} ${current}%\n${label}` : `${bar} ${current}/${total}\n${label}`) : `${bar} ${label} ${current}/${total}`
    }).filter(v => v !== 'not-bar')

    let message = bars.join('\n')

    module.exports.log(tools.config['centered_logging'] ? centerify(message) : message, true)
}