import Markdown from 'markdown-to-jsx';
import React, { useEffect, useState, Component } from 'react';

import Fonts from '/static/docusaurus_css/fonts.css';
import Icons from '/static/docusaurus_css/all.min.css';
import Bootstrap from '/static/docusaurus_css/bootstrap.min.css';
import SignupLogin from '/static/docusaurus_css/signup_login.css';
import Datagrok from '/static/docusaurus_css/datagrok.css';

import TeamLayout from '@site/src/docs/team/default.mdx';
import MainMenu from '@site/src/components/default/menu.jsx';

  
export default function root() {
    return(
        <div>
            <MainMenu/>
            <TeamLayout/>
        </div>
    )
}