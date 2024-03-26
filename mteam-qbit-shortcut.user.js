// ==UserScript==
// @name        m-team qBittorrent 快捷下载
// @namespace   https://github.com/s0urcelab/userscripts
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @grant       GM_getValue
// @require     https://cdn.bootcdn.net/ajax/libs/sweetalert2/11.7.27/sweetalert2.min.js
// @match       https://kp.m-team.cc/detail/*
// @match       https://kp.m-team.cc/browse/*
// @version     1.0
// @author      s0urce
// @icon        https://kp.m-team.cc/favicon.ico
// @license     MIT
// ==/UserScript==

const QS = q => document.querySelector(q)
const QSA = q => document.querySelectorAll(q)

function openSetting() {
    Swal.fire({
        title: "输入qBit",
        input: "text",
        inputAttributes: {
          autocapitalize: "off"
        },
        showCancelButton: true,
        confirmButtonText: "Look up",
        showLoaderOnConfirm: true,
        preConfirm: async (text) => {
          try {
            console.log(1111, text)
          } catch (error) {
            Swal.showValidationMessage(`
              Request failed
            `);
          }
        },
        allowOutsideClick: () => !Swal.isLoading()
      }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: "设置完成！",
                icon: "success"
            });
        }
      });
}

GM_registerMenuCommand("设置", openSetting);

async function getDLUrl(id) {
    const formData = new FormData()
    formData.append("id", id)

    const { code, data } = await fetch("/api/torrent/genDlToken", {
        method: "POST",
        body: formData,
        credentials: 'include'
    })
    .then(response => response.json())
    .catch(console.error)

    if (code === "0") {
        return data
    }
    return ''
}

function resetDetailBtn(btn) {
    btn.textContent = '📦 Qbit下载'
    btn.style.fontWeight = 'bold'
    btn.onclick = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const id = window.location.pathname.match(/detail\/(\d+)[\/\?]?/)[1]
        const downloadLink = await getDLUrl(id)
        window.open(`https://qbit.src.moe:8000/#download=${encodeURIComponent(downloadLink)}`, '_blank')
        return;
    }
}

function resetListBtn(btn, id) {
    btn.onclick = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const downloadLink = await getDLUrl(id)
        window.open(`https://qbit.src.moe:8000/#download=${encodeURIComponent(downloadLink)}`, '_blank')
        return;
    }
}

// 监听节点
const targetNode = document.getElementById('root')
const config = { childList: true, subtree: true }
const observer = new MutationObserver(async () => {
    // 列表
    if (window.location.pathname.startsWith('/browse')) {
        const downloadBtns = Array.from(QSA('.anticon.anticon-download'))
        downloadBtns.forEach(span => {
            const btn = span.parentNode.parentNode
            const tr = btn.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
            const id = tr.dataset.rowKey
            resetListBtn(btn, id)
            observer.disconnect()
        })
    }

    // 详情
    if (window.location.pathname.startsWith('/detail')) {
        const downloadBtn = Array.from(QSA('.ant-btn')).find(v => v.textContent === '下載')
        if (downloadBtn) {
            resetDetailBtn(downloadBtn)
            // 销毁监视者
            observer.disconnect()
        }
    }
})
observer.observe(targetNode, config)