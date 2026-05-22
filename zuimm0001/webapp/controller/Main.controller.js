sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], (Controller, Fragment, JSONModel) => {
    "use strict";

    return Controller.extend("zuimm0001.controller.Main", {
        onInit() {
            this._oModel = this.getOwnerComponent().getModel();
        },
        onItemSelect(oEvent) {
            let oListItem = oEvent.getParameter("listItem"); // 클릭한 아이템의 데이터 
            let sPath = oListItem.getBindingContext().getPath();
            let oData = this._oModel.getProperty(sPath);

            let oDialog = sap.ui.getCore().byId("idDialog"); // sap.ui.getCore() : 현재 다이얼로그가 비동기로 로드되기 때문에 UI 전역에서 찾기 위해 사용

            if (oDialog) { // 있으면 true, 없으면 undefined가 리턴됨.
                oDialog.setModel(new JSONModel(oData), "Popup");
                oDialog.open();

            }
            else {
                // Fragment는 비동기로 동작
                Fragment.load({
                    name: "zuimm0001.view.fragments.Dialog",
                    type: "XML",
                    controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                }).then(function (oLoadedDialog) { // 로드한 후의 반환값이 인자로 들어옴.
                    oLoadedDialog.setModel(new JSONModel(oData), "Popup");
                    oLoadedDialog.open();
                });
            }
        },
        onClose() {
            // this.byId("idDialog").close(); 하면 동작하지 않음
            // Fragment.load해서 로드한 Dialog는 기존 view의 계층 구조와 분리된 UI 요소로 간주된다.
            // 따라서 view에서 접근하는게 아니라, core에서 접근 해야한다.
            sap.ui.getCore().byId("idDialog").close();
        },
        onValueHelpRequest() {
            var oView = this.getView();
            let oWerksDialog = sap.ui.getCore().byId("idWerksHelpDialog"); // sap.ui.getCore() : 현재 다이얼로그가 비동기로 로드되기 때문에 UI 전역에서 찾기 위해 사용
            // let oData = this._oWerksModel.getData();

            if (oWerksDialog) { // 있으면 true, 없으면 undefined가 리턴됨.
                // oDialog.setModel(new JSONModel(oData), "PlantSet");
                oWerksDialog.open();
            }
            else {
                // Fragment는 비동기로 동작
                Fragment.load({
                    name: "zuimm0001.view.fragments.WerksHelp",
                    type: "XML",
                    controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                }).then(function (oLoadedDialog) { // 로드한 후의 반환값이 인자로 들어옴.
                    oView.addDependent(oLoadedDialog);
                    oLoadedDialog.open();
                });
            }
        },
        onValueHelpRequestLgort() {
            var oView = this.getView();
            let oLgortDialog = sap.ui.getCore().byId("idLgortHelpDialog");

            if (oLgortDialog) {
                oLgortDialog.open();
            } else {
                Fragment.load({
                    name: "zuimm0001.view.fragments.LgortHelp",
                    type: "XML",
                    controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                }).then(function (oLoadedDialog) { // 로드한 후의 반환값이 인자로 들어옴.
                    oView.addDependent(oLoadedDialog);
                    oLoadedDialog.open();
                }).catch(function (oError) {
                    // 🌟 여기에 걸리면 XML이나 파일 경로에 문제가 있는 것입니다!
                    console.error("프래그먼트 로드 실패 원인: ", oError);
                    sap.m.MessageToast.show("프래그먼트를 로드하는 중 에러가 발생했습니다. 콘솔을 확인하세요.");
                });
            }
        },
        onConfirmLgort: function (oEvent) {
            // 1. 선택된 행들의 토큰 정보 패키지를 가져옵니다.
            var aTokens = oEvent.getParameter("tokens");
            var oInput = this.byId("idLgort"); // 메인 View의 창고 Input ID

            if (aTokens && aTokens.length > 0) {
                // 2. 다중 선택이 가능하더라도, 첫 번째로 선택된 녀석의 Key(창고번호)를 쏙 빼옵니다.
                var sSelectedKey = aTokens[0].getKey();

                // 3. 메인 화면의 창고 입력창에 값을 주입합니다!
                oInput.setValue(sSelectedKey);
            }

            // 4. 일을 다 마쳤으니 팝업창을 닫아줍니다.
            oEvent.getSource().close();
        },

        // 🌟 [추가 팁] 창을 깔끔하게 닫아주는 Cancel 버튼 매핑
        onCloseLgort: function (oEvent) {
            oEvent.getSource().close();
        }
    });
});