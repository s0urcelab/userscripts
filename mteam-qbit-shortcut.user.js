// ==UserScript==
// @name        m-team qBittorrent 快捷下载
// @namespace   https://github.com/s0urcelab/userscripts
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @grant       GM_getValue
// @require     https://cdn.bootcdn.net/ajax/libs/sweetalert2/11.7.27/sweetalert2.all.min.js
// @match       https://kp.m-team.cc/detail/*
// @match       https://zp.m-team.io/detail/*
// @match       https://next.m-team.cc/detail/*
// @match       https://ob.m-team.cc/detail/*
// @version     1.6
// @author      s0urce
// @description 替换m-team（馒头PT）的列表下载按钮&种子详情页下载按钮，点击可直接跳转qBittorrent webui进行下载
// @icon        https://kp.m-team.cc/favicon.ico
// @license     MIT
// ==/UserScript==

const QS = q => document.querySelector(q)
const QSA = q => document.querySelectorAll(q)

function openSetting() {
    Swal.fire({
        title: "qBittorrent WebUI 设置",
        input: "text",
        inputAttributes: {
            autocapitalize: "off"
        },
        showCancelButton: true,
        inputPlaceholder: GM_getValue('qbit_url', 'http://localhost:8080'),
        confirmButtonText: "确认",
        cancelButtonText: "取消",
        showLoaderOnConfirm: true,
        preConfirm: async (url) => {
            const isUrl = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
            if (isUrl.test(url)) {
                const user_url = new URL(url)
                await GM_setValue('qbit_url', user_url.origin)
            } else {
                Swal.showValidationMessage('输入的url不合法！（需包含https/http）')
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    })
        .then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: '设置成功！',
                    icon: "success"
                });
            }
        });
}

GM_registerMenuCommand("设置", openSetting);

function resetDetailBtn(btn) {
    btn.textContent = '📦 Qbit下载'
    btn.style.fontWeight = 'bold'
    btn.onclick = async (e) => {
        e.preventDefault()
        e.stopPropagation()

        const QBIT_URL = await GM_getValue('qbit_url')
        if (!QBIT_URL) {
            Swal.fire({
                icon: "error",
                title: "请先设置qBit webui地址！",
            })
            return;
        }

        const data = await fetch(`${localStorage.getItem('apiHost')}/torrent/genDlToken`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "TS": Math.floor(Date.now() / 1000),
                "Authorization": localStorage.getItem("auth") || ""
            },
            body: `id=${location.pathname.split('detail/')[1]}`
        }).then(response => response.json())

        if (data.code !== '0') {
            console.error(`获取种子下载地址失败: ${data}`);
        }
        
        window.open(`${QBIT_URL}/#download=${encodeURIComponent(data.data)}`, '_blank')
        return;
    }
}

// 监听节点
const targetNode = document.getElementById('root')
const config = { childList: true, subtree: true }
const observer = new MutationObserver(async () => {
    // 详情
    if (window.location.pathname.startsWith('/detail')) {
        const downloadBtn = Array.from(QSA('.ant-btn')).find(v => v.textContent === '下載')
        if (downloadBtn) {
            resetDetailBtn(downloadBtn)
            observer.disconnect()
        }
    }
})
observer.observe(targetNode, config)