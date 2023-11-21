import * as React from 'react';
import { UuiContext, UuiContexts } from '@epam/uui-core';
import { FlexRow, FlexSpacer, MultiSwitch, RichTextView, ScrollBars, TabButton } from '@epam/promo';
import { svc } from '../../services';
import { getQuery } from '../../helpers';
import { analyticsEvents } from '../../analyticsEvents';
import { TypeRefSection } from '../apiReference/TypeRefSection';
import { ComponentEditorWrapper } from './componentEditor/ComponentEditor';
import cx from 'classnames';
import css from './BaseDocsBlock.module.scss';
import { TDocConfig, TSkin } from '@epam/uui-docs';

enum TMode {
    doc = 'doc',
    propsEditor = 'propsEditor'
}

const DEFAULT_SKIN = TSkin.UUI;
const DEFAULT_MODE = TMode.doc;

const themeName: Record<TSkin, string> = {
    [TSkin.UUI4_promo]: 'uui-theme-promo_important',
    [TSkin.UUI3_loveship]: 'uui-theme-loveship_important',
    [TSkin.UUI]: '',
};

const items: { id: TSkin; caption: string }[] = [
    { caption: 'UUI [Themeable]', id: TSkin.UUI }, { caption: 'UUI3 [Loveship]', id: TSkin.UUI3_loveship }, { caption: 'UUI4 [Promo]', id: TSkin.UUI4_promo },
];

interface BaseDocsBlockState {}

export abstract class BaseDocsBlock extends React.Component<any, BaseDocsBlockState> {
    public static contextType = UuiContext;
    public context: UuiContexts;

    constructor(props: any) {
        super(props);

        const { category, id } = svc.uuiRouter.getCurrentLink().query;
        svc.uuiAnalytics.sendEvent(analyticsEvents.document.pv(id, category));
    }

    private getSkin(): TSkin {
        return getQuery('skin') || DEFAULT_SKIN;
    }

    private getMode(): TMode {
        return getQuery('mode') || DEFAULT_MODE;
    }

    abstract title: string;
    abstract renderContent(): React.ReactNode;

    config: TDocConfig;

    componentDidMount() {
        this.handleMountOrUpdate();
    }

    componentDidUpdate() {
        this.handleMountOrUpdate();
    }

    private handleMountOrUpdate = () => {
        if (this.getMode() === TMode.propsEditor && !this.isPropEditorSupported()) {
            this.handleChangeMode(TMode.doc);
        }
    };

    private renderApiBlock = () => {
        if (this.config) {
            const configGeneric = this.config.bySkin;
            /**
             * API block is always based on the "UUI" TS type.
             * But if it's not defined for some reason, then the first available skin is used instead.
             */
            const skinSpecific = configGeneric[TSkin.UUI] || configGeneric[Object.keys(configGeneric)[0] as TSkin];
            const docsGenType = skinSpecific?.type;
            if (docsGenType) {
                return (
                    <>
                        { this.renderSectionTitle('Api') }
                        <TypeRefSection showCode={ true } typeRef={ docsGenType } />
                    </>
                );
            }
        }
    };

    protected renderSkinSwitcher() {
        return (
            <MultiSwitch<TSkin>
                size="36"
                items={ items }
                value={ this.getSkin() }
                onValueChange={ (newValue: TSkin) => this.handleChangeSkin(newValue) }
            />
        );
    }

    private renderTabsNav() {
        return (
            <FlexRow
                rawProps={ { role: 'tablist' } }
                padding="12"
                cx={ [css.uuiThemePromo, css.secondaryNavigation] }
                borderBottom
            >
                <TabButton
                    size="60"
                    caption="Documentation"
                    isLinkActive={ this.getMode() === TMode.doc }
                    onClick={ () => this.handleChangeMode(TMode.doc) }
                />
                <TabButton
                    size="60"
                    caption="Property Explorer"
                    isLinkActive={ this.getMode() === TMode.propsEditor }
                    onClick={ () => this.handleChangeMode(TMode.propsEditor) }
                />
                <FlexSpacer />
                {this.getMode() === TMode.propsEditor && this.renderSkinSwitcher()}
            </FlexRow>
        );
    }

    private isPropEditorSupported = () => {
        return !!this.config;
    };

    private renderPropsEditor() {
        const skin = this.getSkin();
        return (
            <ComponentEditorWrapper
                onRedirectBackToDocs={ () => this.handleChangeMode(TMode.doc) }
                config={ this.config }
                title={ this.title }
                skin={ skin }
            />
        );
    }

    protected renderSectionTitle(title: string) {
        return (
            <RichTextView cx={ css.themePromo }>
                <h2>{title}</h2>
            </RichTextView>
        );
    }

    protected renderDocTitle() {
        return (
            <RichTextView cx={ css.themePromo }>
                <h1>{this.title}</h1>
            </RichTextView>
        );
    }

    private renderDoc() {
        return (
            <ScrollBars>
                <div className={ cx(css.widthWrapper) }>
                    {this.renderDocTitle()}
                    {this.renderContent()}
                    {this.renderApiBlock()}
                </div>
            </ScrollBars>
        );
    }

    handlePortalTheme(prop: 'clear' | TSkin) {
        // TODO: remove this when all our site will use one 'theme-color-picker' with PropertyExplorer
        const portalId = this.context.uuiLayout.getPortalRootId();
        const rootPortal = document.getElementById(portalId);

        if (prop === 'clear') {
            rootPortal.className = '';
        } else {
            rootPortal.className = themeName[prop];
        }
    }

    private handleChangeSkin(skin: TSkin) {
        this.handlePortalTheme(skin);
        this.handleNav({ skin });
    }

    private handleChangeMode(mode: TMode) {
        this.handlePortalTheme('clear');
        this.handleNav({ mode, skin: DEFAULT_SKIN });
    }

    private handleNav = (params: { mode?: TMode, skin?: TSkin }) => {
        const mode: TMode = params.mode ? params.mode : this.getMode();
        const skin: TSkin = params.skin ? params.skin : this.getSkin();

        svc.uuiRouter.redirect({
            pathname: '/documents',
            query: {
                category: 'components',
                id: getQuery('id'),
                mode,
                skin,
            },
        });
    };

    render() {
        return (
            <div className={ css.container }>
                {this.isPropEditorSupported() && this.renderTabsNav()}
                {this.getMode() === TMode.propsEditor ? this.renderPropsEditor() : this.renderDoc()}
            </div>
        );
    }
}
