const $$ = (q) => document.querySelector(q)
const $$$ = (q) => document.querySelectorAll(q)

const globalStyle = `
.wp-playlist-tracks {
    display: none!important;
}
.wp-video-playlist {
    display: flex;
    padding: 0!important;
    border: none!important;
    background: none!important;
}
.entry > p {
    display: none;
}
.player-sider {
    width: 220px;
    display: flex;
    flex-direction: column;
    background-color: #2e2e2e;
    border-radius: 8px;
    margin-left: 10px;
    padding: 4px;
}
.tab-item {
    cursor: pointer;
    margin-bottom: 6px;
    padding: 8px;
    color: white;
    background-color: #5a5a5a;
    border-radius: 5px;
}
.tab-item.playing {
    font-weight: bold;
    color: #3a8fb7;
    background-color: #232323;
}
.tab-item:not(.playing):hover {
    background-color: #232323;
}
.tab-item > .indicator {
    height: 14px;
    width: 14px;
    font-size: 14px;
    margin-right: 5px;
}
.switch-root {
    cursor: pointer;
    user-select: none;
    position: relative;
    background: #e0e0e0;
    border-radius: 26px;
    width: 174px;
    padding: 2px;
}
.sw-group {
    position: absolute;
    top: 0;
    left: 0;
    padding: 2px;
    width: 170px;
    display: flex;
    justify-content: space-between;
}
.sw-item {
    line-height: 30px;
    padding: 0 10px;
    color: #666;
}
.sw-item.active {
    font-weight: bold;
    color: #333;
}
.switch-root > .indicator {
    transition: all 0.2s ease;
    margin-left: 0;
    width: 86px;
    height: 30px;
    background: #fff;
    border-radius: 26px;
    box-shadow: 0px 0px 6px -2px #111;
}
.switch-root > .indicator.overseas {
    margin-left: 84px;
}
.ep-tip {
    margin: 10px 0;
    color: white;
}
`
function parseResUrl(region, d) {
    // 海外线路
    if (region == 'overseas') return { ...d, url: `https://w.ddys.art${d.src0}?ddrkey=${d.src2}` }

    const domain = window.location.hostname
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            responseType: 'json',
            headers: {
                'referer': `https://${domain}/`
            },
            url: `https://${domain}/getvddr/video?id=${d.src1}&dim=1080P&type=mix`,
            onload: res => {
                resolve({ ...d, url: res.response.url })
            },
            onerror: function (error) {
                reject(error)
            },
        })
    })
}

class Tabs {
    constructor(init) {
        this.root = init.root
        this.data = init.data
        this.onSelect = init.onSelect
        this.selectedKey = init.data[0].key
    }

    render(key = this.selectedKey) {
        // update selectedKey
        this.selectedKey = key
        // render dom
        this.root.innerHTML = this.data.reduce((acc, curr) => {
            const isTarget = key === curr.key
            return `${acc}
                <div class="tab-item ${isTarget ? 'playing' : ''}" data-tab-key="${curr.key}">
                ${isTarget ? '<img class="indicator" src="//s1.hdslb.com/bfs/static/jinkela/video/asserts/playing.gif"></img>' : ''}
                ${curr.label}
            </div>
            `
        }, '')
        // bind click
        const self = this
        for (const tabElment of this.root.children) {
            tabElment.onclick = function() {
                const tabKey = tabElment.dataset.tabKey
                const record = self.data.find(v => v.key === tabKey)
                self.render(tabKey)
                self.onSelect(tabKey, record)
            }
        }
    }
}
class Switch {
    constructor(init) {
        this.root = init.root
        this.data = init.data
        this.onSelect = init.onSwitch
        this.selectedKey = init.data[0].key
    }

    render(key = this.selectedKey) {
        // update selectedKey
        this.selectedKey = key
        // render dom
        const group = this.data.reduce((acc, curr) => {
            const isTarget = key === curr.key
            return `${acc}
                <div class="sw-item ${isTarget ? 'active' : ''}" data-sw-key="${curr.key}">
                ${curr.label}
            </div>
            `
        }, '')
        this.root.innerHTML = `<div class="indicator ${key}"></div><div class="sw-group">${group}</div>`
        // bind click
        const self = this
        for (const swElment of this.root.querySelector('.sw-group').children) {
            swElment.onclick = function() {
                const swKey = swElment.dataset.swKey
                const record = self.data.find(v => v.key === swKey)
                self.render(swKey)
                self.onSelect(swKey, record)
            }
        }
    }
}

; (async function () {
    'use strict';

    const originContainer = $$('.wp-video-playlist')
    // cannot found Player, quit
    if (!originContainer) return;

    // inject global style
    GM_addStyle(globalStyle)
    // hide origin container
    for (const item of originContainer.children) {
        item.style.display = 'none'
    }

    // append container for xgplayer
    originContainer.innerHTML += `
    <div id="xgplayer"></div>
    <div class="player-sider">
    <div class="switch-root"></div>
    <p class="ep-tip">选集：</p>
    <div class="tabs-root"></div>
    </div>
    `
    // get video resource from page data
    const res = JSON.parse($$('.wp-playlist-script').textContent)
    const resPromise = res.tracks
        .map((track, idx) => ({ ...track, key: `${idx + 1}`, label: track.caption }))
        .map(d => parseResUrl(window.localStorage['region'], d))
    const resGroups = await Promise.all(resPromise)

    // init xgplayer
    const initVolume = window.localStorage['volume'] ? parseFloat(window.localStorage['volume']) : 1
    const isWatched = window.localStorage[location.pathname]
    const initEp = isWatched ? JSON.parse(isWatched).ep : '1'
    const initPlayUrl = resGroups.find(v => v.key === initEp).url

    console.warn(`当前播放资源url：${initPlayUrl}`)
    const player = new window.Player({
        id: 'xgplayer',
        url: initPlayUrl,
        volume: initVolume,
        fluid: true,
        videoInit: true,
        lastPlayTimeHideDelay: 3,
        ...isWatched && {lastPlayTime: JSON.parse(isWatched).seek},
    })

    // init switch
    const switchs = new Switch({
        root: $$('.switch-root'),
        data: [{ key: 'domestic', label: '国内线路' }, { key: 'overseas', label: '海外线路' }],
        onSwitch: (key, record) => {
            console.warn(`切换线路：${record.label}，即将刷新页面`)
            window.localStorage['region'] = key
            window.location.reload()
        }
    })
    switchs.render(window.localStorage['region'])
    // init tabs
    const tabs = new Tabs({
        root: $$('.tabs-root'),
        data: resGroups,
        onSelect: (key, record) => {
            console.warn(`切换选集：【${key}】${record.label}`)
            player.src = record.url
            console.warn(`当前播放资源url：${record.url}`)
            player.play()
        }
    })
    // render tabs
    tabs.render(initEp)

    // update video progress
    player.on('timeupdate', function({ currentTime }) {
        window.localStorage[location.pathname] = JSON.stringify({
            seek: currentTime,
            ep: tabs.selectedKey,
        })
    })
    // update volume
    player.on('volumechange', function({ volume }) {
        window.localStorage['volume'] = volume
    })

})()
