/* وُدّا — رانتایم مشترک */
(function(){
  'use strict';

  

  /* ناوبری فعال بر اساس body[data-page] */
  var page=document.body.getAttribute('data-page');
  if(page){
    document.querySelectorAll('.topnav a').forEach(function(a){
      a.classList.toggle('on',a.getAttribute('data-page')===page);
    });
  }

  /* تب‌ها: .tabs[data-tabs] > .tab[data-target] + .tab-panel#id */
  document.querySelectorAll('[data-tabs]').forEach(function(group){
    var tabs=group.querySelectorAll('.tab');
    tabs.forEach(function(tab){
      tab.addEventListener('click',function(){
        tabs.forEach(function(x){x.classList.remove('active');x.setAttribute('aria-selected','false')});
        tab.classList.add('active');
        tab.setAttribute('aria-selected','true');
        var target=tab.getAttribute('data-target');
        if(target){
          var scopeSel=group.getAttribute('data-scope');
          var root=scopeSel?document.querySelector(scopeSel):document;
          if(root){
            root.querySelectorAll('.tab-panel').forEach(function(p){
              p.classList.toggle('active',p.id===target);
            });
          }
        }
        var fn=tab.getAttribute('data-call');
        if(fn&&typeof window[fn]==='function')window[fn](tab);
      });
    });
  });

  /* توست */
  var toastTimer=null;
  window.vToast=function(msg){
    var el=document.querySelector('.toast');
    if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el);}
    el.textContent=msg;
    requestAnimationFrame(function(){el.classList.add('show')});
    clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){el.classList.remove('show')},2400);
  };

  /* ارقام فارسی */
  window.faNum=function(n){return String(n).replace(/\d/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'[d]})};
  window.faToEn=function(s){return String(s).replace(/[۰-۹]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)})};
})();
