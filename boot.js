try {
  await import('./scene.js');
} catch (error) {
  console.error('Scene initialization failed:', error);
  const loader=document.querySelector('#loading');
  if(loader){
    loader.querySelector('p').textContent='THE NIGHT IS ON HOLD';
    loader.querySelector('small').textContent='请通过本地服务打开，并使用支持 WebGL 2 的浏览器。';
    loader.querySelector('.loading-track').remove();
    const detail=document.createElement('small');
    detail.style.marginTop='16px';
    detail.textContent='在项目目录运行 npm install，然后运行 npm start。';
    loader.appendChild(detail);
  }
}
