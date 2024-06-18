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

module.exports.log = (message) => {
    console.clear();
    console.log(message);
}

module.exports.progress = (current, total, label = '') => {
    current = Math.floor(current);

    const [bar] = createFilledBar(total, current);

    module.exports.log(`${bar} ${label} ${current}/${total}`);
}

module.exports.multipleProgress = (progressList = []) => {
    let bars = progressList.map(v => {
        if(typeof v !== 'object') return v
        if(!v.total || !v.current || !v.label) return 'not-bar'

        let { total, current, label } = v

        const [bar] = createFilledBar(total, current);

        return `${bar} ${label} ${current}/${total}`
    }).filter(v => v !== 'not-bar')

    module.exports.log(bars.join('\n'))
}